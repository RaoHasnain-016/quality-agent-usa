import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.css']
})
export class PricingComponent implements OnInit {
  plans: any[] = [
    { id: 'free', name: 'Free', monthlyPrice: 0, batchUploadLimit: 5, memberLimit: 2, evalLimit: 1000000, description: 'Explore every AgentQA feature with a monthly file allowance.', checkoutAvailable: true },
    { id: 'starter', name: 'Starter', monthlyPrice: 49, batchUploadLimit: 50, memberLimit: 5, evalLimit: 1000, description: 'For teams establishing a repeatable AI quality program.', checkoutAvailable: true },
    { id: 'pro', name: 'Pro', monthlyPrice: 149, batchUploadLimit: 250, memberLimit: 20, evalLimit: 10000, description: 'For production teams monitoring multiple AI agents.', checkoutAvailable: true },
    { id: 'team', name: 'Enterprise', monthlyPrice: 499, batchUploadLimit: 1000000, memberLimit: 1000000, evalLimit: 1000000, description: 'For organizations requiring scale, governance, and support.', checkoutAvailable: true }
  ];
  subscription: any = null;
  loading = true;
  busyPlan = '';
  notice = '';
  error = '';
  invoices: any[] = [];

  readonly features = [
    ['All quality evaluation dimensions', true, true, true, true],
    ['Gemini-powered transcript analysis', true, true, true, true],
    ['Research, reports, and live analysis', true, true, true, true],
    ['Monthly batch files', '5', '50', '250', 'Custom'],
    ['Monthly conversation evaluations', '100', '1,000', '10,000', 'Custom'],
    ['Priority evaluation queue', false, false, true, true],
    ['Dedicated success support', false, false, false, true]
  ];

  constructor(private api: ApiService) {}

  async ngOnInit() {
    try {
      const query = new URLSearchParams(window.location.search);
      const sessionId = query.get('session_id');
      if (query.get('checkout') === 'success' && sessionId) {
        await this.api.confirmCheckout(sessionId);
        this.notice = 'Payment confirmed. Your selected plan is now active.';
      } else if (query.get('checkout') === 'success') {
        this.notice = 'Payment completed. Your plan will update after Stripe confirms the subscription.';
      }
      if (query.get('checkout') === 'cancelled') this.notice = 'Checkout cancelled. Your current plan remains active.';

      const [plansResult, subscriptionResult, invoicesResult] = await Promise.allSettled([
        this.api.getPlans(),
        this.api.getSubscription(),
        this.api.getInvoices()
      ]);
      if (plansResult.status === 'fulfilled') this.plans = (plansResult.value as any).plans || this.plans;
      if (subscriptionResult.status === 'fulfilled') this.subscription = subscriptionResult.value;
      if (invoicesResult.status === 'fulfilled') this.invoices = (invoicesResult.value as any).invoices || [];
      if (subscriptionResult.status === 'rejected') this.error = 'Unable to load your current subscription. Plan selection is still available.';
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load billing information.';
    } finally {
      this.loading = false;
    }
  }

  async choosePlan(plan: any) {
    if (plan.id === this.subscription?.plan?.id) return;
    if (plan.id === 'free') {
      this.error = this.subscription?.plan?.id === 'free'
        ? 'The Free plan is already active.'
        : 'Use the secure Stripe Billing Portal to cancel a paid subscription and return to Free.';
      return;
    }
    if (!plan.checkoutAvailable) {
      this.error = 'Add this plan price ID to the Stripe environment configuration first.';
      return;
    }
    this.busyPlan = plan.id;
    try {
      const result: any = await this.api.createCheckout(plan.id);
      window.location.href = result.url;
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to start Stripe Checkout.';
      this.busyPlan = '';
    }
  }

  async manageBilling() {
    this.busyPlan = 'portal';
    try {
      const result: any = await this.api.createBillingPortal();
      window.location.href = result.url;
    } catch (error: any) {
      this.error = error?.error?.error || 'Billing portal becomes available after your first paid subscription.';
      this.busyPlan = '';
    }
  }

  percent(used = 0, limit = 1) {
    return Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  }
}
