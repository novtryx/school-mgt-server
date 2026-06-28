import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Plan, BillingCycle } from './entities/plan.entity';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { InitiateSubscriptionDto } from './dto/initiate-subscription.dto';
import { PaystackService } from './paystack.service';
import { SchoolsService } from '../schools/schools.service';
import { ConfigService } from '@nestjs/config';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/app.exceptions';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly paystackService: PaystackService,
    private readonly schoolsService: SchoolsService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Plan Management ──────────────────────────────────────────────────────

  /**
   * Create a new plan. Only super admins call this.
   */
  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    const existing = await this.plansRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new DuplicateResourceException('Plan', 'slug');
    }
    const plan = this.plansRepository.create(dto);
    return this.plansRepository.save(plan);
  }

  /**
   * Get all active plans for the public pricing page, ordered by sortOrder.
   */
  async getActivePlans(): Promise<Plan[]> {
    return this.plansRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Get all plans including inactive ones (super admin view).
   */
  async getAllPlans(): Promise<Plan[]> {
    return this.plansRepository.find({ order: { sortOrder: 'ASC' } });
  }

  /**
   * Get a single plan by UUID.
   */
  async findPlanById(id: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) {
      throw new ResourceNotFoundException('Plan', id);
    }
    return plan;
  }

  /**
   * Update a plan's details or pricing.
   */
  async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findPlanById(id);
    Object.assign(plan, dto);
    return this.plansRepository.save(plan);
  }

  /**
   * Soft-deactivate a plan so it no longer appears on the pricing page.
   */
  async deactivatePlan(id: string): Promise<Plan> {
    const plan = await this.findPlanById(id);
    plan.isActive = false;
    return this.plansRepository.save(plan);
  }

  // ─── Subscription Flow ────────────────────────────────────────────────────

  /**
   * Initiate a subscription payment via Paystack.
   * Creates a pending subscription record and returns the Paystack checkout URL.
   */
  async initiateSubscription(
    dto: InitiateSubscriptionDto,
    adminEmail: string,
  ): Promise<{ authorizationUrl: string; reference: string }> {
    const plan = await this.findPlanById(dto.planId);

    if (plan.isCustom) {
      throw new BadRequestException(
        'Custom plan requires manual setup. Please contact support.',
      );
    }

    if (plan.priceKobo === 0) {
      throw new BadRequestException(
        'This plan is free. Use the activate-free endpoint instead.',
      );
    }

    const school = await this.schoolsService.findById(dto.schoolId);

    const reference = `SUB-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const callbackUrl = `${appUrl}/api/v1/subscriptions/paystack/callback`;

    // Create a pending subscription record before redirecting
    const subscription = this.subscriptionsRepository.create({
      schoolId: dto.schoolId,
      planId: dto.planId,
      status: SubscriptionStatus.PENDING,
      paystackReference: reference,
      amountPaidKobo: 0,
    });
    await this.subscriptionsRepository.save(subscription);

    const paystackResponse = await this.paystackService.initializeTransaction({
      email: adminEmail,
      amountKobo: Number(plan.priceKobo),
      reference,
      callbackUrl,
      metadata: {
        schoolId: dto.schoolId,
        schoolName: school.name,
        planId: dto.planId,
        planName: plan.name,
        subscriptionId: subscription.id,
      },
    });

    return {
      authorizationUrl: paystackResponse.authorizationUrl,
      reference,
    };
  }

  /**
   * Activate a free plan (priceKobo = 0) without going through Paystack.
   */
  async activateFreePlan(dto: InitiateSubscriptionDto): Promise<Subscription> {
    const plan = await this.findPlanById(dto.planId);

    if (plan.priceKobo !== 0) {
      throw new BadRequestException('This plan requires payment. Use the initiate endpoint.');
    }

    await this.deactivateCurrentSubscription(dto.schoolId);

    const subscription = this.subscriptionsRepository.create({
      schoolId: dto.schoolId,
      planId: dto.planId,
      status: SubscriptionStatus.ACTIVE,
      amountPaidKobo: 0,
      startsAt: new Date(),
      expiresAt: this.calculateExpiry(plan.billingCycle),
    });

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Handle the Paystack callback redirect after the user completes payment.
   * Verifies the transaction and activates the subscription.
   */
  async handleCallback(reference: string): Promise<Subscription> {
    return this.activateSubscriptionByReference(reference);
  }

  /**
   * Handle an incoming Paystack webhook event.
   * Called by the webhook endpoint after signature verification.
   */
  async handleWebhookEvent(event: {
    event: string;
    data: { reference: string };
  }): Promise<void> {
    if (event.event !== 'charge.success') {
      return;
    }

    try {
      await this.activateSubscriptionByReference(event.data.reference);
    } catch (err) {
      this.logger.error(
        `Webhook: failed to activate subscription for reference ${event.data.reference}`,
        err,
      );
    }
  }

  /**
   * Get the active subscription for a school including plan details.
   */
  async getActiveSubscription(schoolId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: { schoolId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get the active plan limits for a school.
   * Used by other modules (students, staff) to enforce caps.
   */
  async getActivePlanForSchool(
    schoolId: string,
  ): Promise<{ studentLimit: number | null; staffLimit: number | null; name: string; planId: string | null }> {
    const subscription = await this.getActiveSubscription(schoolId);

    if (!subscription) {
      // Default to Starter limits if no active subscription
      const starterPlan = await this.plansRepository.findOne({
        where: { slug: 'starter' },
      });
      return {
        studentLimit: starterPlan?.studentLimit ?? 150,
        staffLimit: starterPlan?.staffLimit ?? null,
        name: starterPlan?.name ?? 'Starter',
        planId: starterPlan?.id ?? null,
      };
    }

    return {
      studentLimit: subscription.plan.studentLimit ?? null,
      staffLimit: subscription.plan.staffLimit ?? null,
      name: subscription.plan.name,
      planId: subscription.plan.id,
    };
  }

  /**
   * Get subscription history for a school.
   */
  async getSubscriptionHistory(schoolId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: { schoolId },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Verify with Paystack and activate the subscription tied to a reference.
   */
  private async activateSubscriptionByReference(reference: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { paystackReference: reference },
      relations: { plan: true },
    });

    if (!subscription) {
      throw new ResourceNotFoundException('Subscription', reference);
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return subscription; // Already activated — idempotent
    }

    const verified = await this.paystackService.verifyTransaction(reference);

    if (verified.status !== 'success') {
      throw new BadRequestException(`Payment not successful. Status: ${verified.status}`);
    }

    await this.deactivateCurrentSubscription(subscription.schoolId);

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.paystackTransactionId = String(verified.transactionId);
    subscription.amountPaidKobo = verified.amount;
    subscription.startsAt = new Date(verified.paidAt);
    subscription.expiresAt = this.calculateExpiry(
      subscription.plan.billingCycle,
      new Date(verified.paidAt),
    );

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Expire any currently active subscription for a school before activating a new one.
   */
  private async deactivateCurrentSubscription(schoolId: string): Promise<void> {
    await this.subscriptionsRepository.update(
      { schoolId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.EXPIRED },
    );
  }

  /**
   * Calculate the expiry date based on the billing cycle.
   */
  private calculateExpiry(cycle: BillingCycle, from: Date = new Date()): Date {
    const expiry = new Date(from);
    switch (cycle) {
      case BillingCycle.MONTHLY:
        expiry.setMonth(expiry.getMonth() + 1);
        break;
      case BillingCycle.TERMLY:
        expiry.setMonth(expiry.getMonth() + 4);
        break;
      case BillingCycle.ANNUALLY:
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
    }
    return expiry;
  }
}