import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { BatchesComponent } from './components/batches/batches.component';
import { BatchDetailComponent } from './components/batch-detail/batch-detail.component';
import { ConversationDetailComponent } from './components/conversation-detail/conversation-detail.component';
import { OnboardingStartComponent } from './components/onboarding-start/onboarding-start.component';
import { OnboardingCompanyComponent } from './components/onboarding-company/onboarding-company.component';
import { OnboardingThresholdComponent } from './components/onboarding-threshold/onboarding-threshold.component';
import { NewBatchComponent } from './components/new-batch/new-batch.component';
import { BatchEvaluatingComponent } from './components/batch-evaluating/batch-evaluating.component';
import { ProductPageComponent } from './components/product-page/product-page.component';
import { AuthFlowComponent } from './components/auth-flow/auth-flow.component';
import { PricingComponent } from './components/pricing/pricing.component';
import { LandingComponent } from './components/landing/landing.component';
import { ConversationsComponent } from './components/conversations/conversations.component';
import { AlertsComponent } from './components/alerts/alerts.component';
import { ResearchComponent } from './components/research/research.component';
import { AnalysisComponent } from './components/analysis/analysis.component';
import { ReportsComponent } from './components/reports/reports.component';
import { SettingsComponent } from './components/settings/settings.component';
import { WorkspaceAdminComponent } from './components/workspace-admin/workspace-admin.component';
import { authGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: AuthFlowComponent, data: { mode: 'signup' } },
  { path: 'forgot-password', component: AuthFlowComponent, data: { mode: 'forgot' } },
  { path: 'reset-password', component: AuthFlowComponent, data: { mode: 'reset' } },
  { path: 'verify-email', component: AuthFlowComponent, data: { mode: 'verify' } },
  { path: 'accept-invite', component: AuthFlowComponent, data: { mode: 'invite' } },
  { path: 'pricing', component: PricingComponent, canActivate: [authGuard] },

  { path: 'onboarding', component: OnboardingStartComponent },
  { path: 'onboarding/company', component: OnboardingCompanyComponent },
  { path: 'onboarding/threshold', component: OnboardingThresholdComponent },

  { path: 'dashboard', component: DashboardComponent },
  { path: 'batches', component: BatchesComponent },
  { path: 'batches/new', component: NewBatchComponent },
  { path: 'batches/new/configure', component: NewBatchComponent, data: { step: 'configure' } },
  { path: 'batches/evaluating', component: BatchEvaluatingComponent },
  { path: 'batches/:id', component: BatchDetailComponent },
  { path: 'conversations/flagged', component: ConversationsComponent, data: { status: 'flagged' } },
  { path: 'conversations/reviewed', component: ConversationsComponent, data: { status: 'reviewed' } },
  { path: 'conversations', component: ConversationsComponent },
  { path: 'conversations/:id', component: ConversationDetailComponent },

  { path: 'research/new', component: ResearchComponent, data: { mode: 'new' } },
  { path: 'research/sources', component: ProductPageComponent, data: { eyebrow: 'Research', title: 'Evidence sources', description: 'Manage policy documents, datasets, and trusted references.', mode: 'research', primary: 'Add source' } },
  { path: 'research/library', component: ResearchComponent },
  { path: 'research/:id', component: ResearchComponent },
  { path: 'research', component: ResearchComponent },

  { path: 'analysis/live', component: AnalysisComponent, data: { view: 'live' } },
  { path: 'analysis/compare', component: AnalysisComponent, data: { view: 'compare' } },
  { path: 'analysis/trends', component: AnalysisComponent, data: { view: 'trends' } },
  { path: 'analysis/dimensions', component: AnalysisComponent, data: { view: 'dimensions' } },
  { path: 'analysis/failures', component: AnalysisComponent, data: { view: 'failures' } },
  { path: 'analysis/latency', component: AnalysisComponent, data: { view: 'live' } },
  { path: 'analysis', component: AnalysisComponent, data: { view: 'overview' } },

  { path: 'reports/new', component: ReportsComponent, data: { mode: 'new' } },
  { path: 'reports/scheduled', component: ReportsComponent, data: { mode: 'scheduled' } },
  { path: 'reports/:id', component: ReportsComponent },
  { path: 'reports', component: ReportsComponent },

  { path: 'alerts/rules', component: AlertsComponent, data: { view: 'rules' } },
  { path: 'alerts/history', component: AlertsComponent, data: { view: 'history' } },
  { path: 'alerts', component: AlertsComponent },

  { path: 'settings/profile', component: SettingsComponent, data: { section: 'profile' } },
  { path: 'settings/workspace', component: SettingsComponent, data: { section: 'workspace' } },
  { path: 'settings/members', component: SettingsComponent, data: { section: 'members' } },
  { path: 'settings/integrations', component: SettingsComponent, data: { section: 'integrations' } },
  { path: 'settings/models', component: SettingsComponent, data: { section: 'models' } },
  { path: 'settings/api-keys', component: SettingsComponent, data: { section: 'api-keys' } },
  { path: 'settings/billing', component: PricingComponent, canActivate: [authGuard] },
  { path: 'settings/notifications', component: SettingsComponent, data: { section: 'notifications' } },
  { path: 'settings/security', component: SettingsComponent, data: { section: 'security' } },
  { path: 'settings/appearance', component: SettingsComponent, data: { section: 'appearance' } },
  { path: 'settings', redirectTo: '/settings/workspace', pathMatch: 'full' },

  { path: 'usage', component: WorkspaceAdminComponent, data: { view: 'usage' }, canActivate: [authGuard] },
  { path: 'audit-log', component: WorkspaceAdminComponent, data: { view: 'audit' }, canActivate: [authGuard] },
  { path: 'help', component: WorkspaceAdminComponent, data: { view: 'help' }, canActivate: [authGuard] },

  { path: '', component: LandingComponent },
  { path: '**', redirectTo: '/dashboard' }
];
