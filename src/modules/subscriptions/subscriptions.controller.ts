import * as common from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { PaystackService } from './paystack.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { InitiateSubscriptionDto } from './dto/initiate-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { BadRequestException } from '@nestjs/common';

@ApiTags('subscriptions')
@common.Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paystackService: PaystackService,
  ) {}

  // ─── Public Plan Endpoints ────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all active plans for the pricing page' })
  @common.Get('plans')
  getActivePlans() {
    return this.subscriptionsService.getActivePlans();
  }

  // ─── Admin Plan Management ────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all plans including inactive (super admin)' })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @common.Get('plans/all')
  getAllPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @ApiOperation({ summary: 'Create a new plan (super admin)' })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @common.Post('plans')
  createPlan(@common.Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @ApiOperation({ summary: 'Update a plan (super admin)' })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @common.Patch('plans/:id')
  updatePlan(
    @common.Param('id', common.ParseUUIDPipe) id: string,
    @common.Body() dto: UpdatePlanDto,
  ) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @ApiOperation({ summary: 'Deactivate a plan (super admin)' })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @common.HttpCode(common.HttpStatus.OK)
  @common.Delete('plans/:id')
  deactivatePlan(@common.Param('id', common.ParseUUIDPipe) id: string) {
    return this.subscriptionsService.deactivatePlan(id);
  }

  // ─── Subscription Flow ────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Initiate a Paystack payment for a subscription plan',
    description: 'Returns a Paystack authorization URL. Redirect the user to this URL to complete payment.',
  })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @common.Post('initiate')
  initiateSubscription(
    @common.Body() dto: InitiateSubscriptionDto,
    @CurrentUser() user: User,
  ) {
    return this.subscriptionsService.initiateSubscription(dto, user.email);
  }

  @ApiOperation({
    summary: 'Activate a free plan without payment',
  })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @common.Post('activate-free')
  activateFreePlan(@common.Body() dto: InitiateSubscriptionDto) {
    return this.subscriptionsService.activateFreePlan(dto);
  }

  @ApiOperation({
    summary: 'Paystack callback — called after user completes payment on Paystack',
    description: 'Verifies the payment and activates the subscription. Redirect the user here from Paystack.',
  })
  @common.Get('paystack/callback')
  async paystackCallback(
    @common.Query('reference') reference: string,
    @common.Res() res: Response,
  ) {
    if (!reference) {
      throw new BadRequestException('Missing payment reference');
    }

    await this.subscriptionsService.handleCallback(reference);

    // Redirect to frontend success page
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    res.redirect(`${appUrl}/dashboard?subscription=success`);
  }

  @ApiOperation({
    summary: 'Paystack webhook — receives payment events from Paystack servers',
    description: 'Do not call this manually. Paystack calls this automatically.',
  })
  @common.HttpCode(common.HttpStatus.OK)
  @common.Post('paystack/webhook')
  async paystackWebhook(
    @common.Headers('x-paystack-signature') signature: string,
    @common.Req() req: common.RawBodyRequest<Request>,
  ) {
    const rawBody = (req.rawBody ?? Buffer.alloc(0)).toString('utf8');

    if (!this.paystackService.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody) as { event: string; data: { reference: string } };
    await this.subscriptionsService.handleWebhookEvent(event);

    return { received: true };
  }

  // ─── School Subscription Queries ──────────────────────────────────────────

  @ApiOperation({ summary: 'Get the active subscription for a school' })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @common.Get('school/:schoolId/active')
  getActiveSubscription(@common.Param('schoolId', common.ParseUUIDPipe) schoolId: string) {
    return this.subscriptionsService.getActiveSubscription(schoolId);
  }

  @ApiOperation({ summary: 'Get subscription history for a school' })
  @ApiBearerAuth('access-token')
  @common.UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @common.Get('school/:schoolId/history')
  getHistory(@common.Param('schoolId', common.ParseUUIDPipe) schoolId: string) {
    return this.subscriptionsService.getSubscriptionHistory(schoolId);
  }
}