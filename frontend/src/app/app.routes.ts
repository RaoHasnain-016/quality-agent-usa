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

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'onboarding', component: OnboardingStartComponent },
  { path: 'onboarding/company', component: OnboardingCompanyComponent },
  { path: 'onboarding/threshold', component: OnboardingThresholdComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'batches', component: BatchesComponent },
  { path: 'batches/new', component: NewBatchComponent },
  { path: 'batches/new/configure', component: NewBatchComponent, data: { step: 'configure' } },
  { path: 'batches/evaluating', component: BatchEvaluatingComponent },
  { path: 'batches/:id', component: BatchDetailComponent },
  { path: 'conversations/:id', component: ConversationDetailComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
