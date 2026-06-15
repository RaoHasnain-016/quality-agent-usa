import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css']
})
export class AlertsComponent implements OnInit {
  alerts: any[] = [];
  summary: any = { statuses: [], severities: [], categories: [], threshold: 70, email: '' };
  view: 'queue' | 'history' | 'rules' = 'queue';
  status = '';
  severity = '';
  category = '';
  page = 1;
  total = 0;
  pages = 1;
  loading = true;
  actionId = '';
  notice = '';
  error = '';
  threshold = 70;
  email = '';

  constructor(private api: ApiService, private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    this.view = this.route.snapshot.data['view'] || 'queue';
    this.status = this.view === 'history' ? 'resolved' : '';
    await this.refresh();
  }

  count(group: any[], key: string) {
    return group?.find(item => item._id === key)?.count || 0;
  }

  get activeCount() { return this.count(this.summary.statuses, 'open') + this.count(this.summary.statuses, 'acknowledged'); }
  get criticalCount() { return this.count(this.summary.severities, 'critical'); }
  get acknowledgedCount() { return this.count(this.summary.statuses, 'acknowledged'); }
  get resolvedCount() { return this.count(this.summary.statuses, 'resolved'); }

  async refresh(page = this.page) {
    this.loading = true;
    this.error = '';
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (this.status) params['status'] = this.status;
      if (this.severity) params['severity'] = this.severity;
      if (this.category) params['category'] = this.category;
      const [response, summary]: any[] = await Promise.all([this.api.getAlerts(params), this.api.getAlertSummary()]);
      this.alerts = response.alerts || [];
      this.page = response.pagination?.page || page;
      this.total = response.pagination?.total || 0;
      this.pages = Math.max(1, response.pagination?.pages || 1);
      this.summary = summary;
      this.threshold = summary.threshold ?? 70;
      this.email = summary.email || '';
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load alerts.';
    } finally {
      this.loading = false;
    }
  }

  setView(view: 'queue' | 'history' | 'rules') {
    this.view = view;
    this.status = view === 'history' ? 'resolved' : '';
    if (view !== 'rules') this.refresh(1);
  }

  clearFilters() {
    this.status = this.view === 'history' ? 'resolved' : '';
    this.severity = '';
    this.category = '';
    this.refresh(1);
  }

  async acknowledge(alert: any) {
    this.actionId = alert._id;
    try {
      await this.api.updateAlert(alert._id, 'acknowledged');
      this.notice = 'Alert acknowledged and added to the active investigation queue.';
      await this.refresh(this.page);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to acknowledge alert.';
    } finally {
      this.actionId = '';
    }
  }

  async resolve(alert: any) {
    const note = window.prompt('Add a resolution note:', 'Reviewed and corrective action completed.');
    if (note === null) return;
    this.actionId = alert._id;
    try {
      await this.api.updateAlert(alert._id, 'resolved', note);
      this.notice = 'Alert resolved and moved to history.';
      await this.refresh(this.page);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to resolve alert.';
    } finally {
      this.actionId = '';
    }
  }

  async saveRules() {
    try {
      await this.api.updateSettings({ alertThreshold: this.threshold, alertEmail: this.email });
      this.notice = 'Alert routing and quality threshold saved.';
      await this.refresh();
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to save alert rules.';
    }
  }

  openSource(alert: any) {
    this.router.navigate([alert.sourceType === 'batch' ? '/batches' : '/conversations', alert.sourceId]);
  }
}
