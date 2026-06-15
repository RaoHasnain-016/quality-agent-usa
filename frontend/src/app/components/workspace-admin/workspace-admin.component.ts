import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-workspace-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './workspace-admin.component.html',
  styleUrls: ['./workspace-admin.component.css']
})
export class WorkspaceAdminComponent implements OnInit {
  view: 'usage' | 'audit' | 'help' = 'usage';
  loading = true;
  error = '';
  notice = '';
  usage: any = { quotas: {}, totals: {}, daily: [], plan: {} };
  audit: any = { items: [], total: 0, page: 1, pages: 1 };
  support: any = { articles: [], tickets: [], contact: {} };
  auditCategory = '';
  search = '';
  selectedArticle: any = null;
  ticket = { subject: '', category: 'product', priority: 'normal', message: '' };
  submitting = false;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  async ngOnInit() {
    this.route.data.subscribe(data => this.view = data['view'] || 'usage');
    await this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      if (this.view === 'usage') this.usage = await this.api.getWorkspaceUsage();
      if (this.view === 'audit') this.audit = await this.api.getAuditLogs(this.auditCategory);
      if (this.view === 'help') this.support = await this.api.getSupportCenter();
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load workspace data.';
    } finally {
      this.loading = false;
    }
  }

  percent(item: any) {
    return Math.min(100, Math.round(((item?.used || 0) / Math.max(1, item?.limit || 1)) * 100));
  }

  filteredAudit() {
    const query = this.search.trim().toLowerCase();
    return query ? this.audit.items.filter((item: any) => Object.values(item).join(' ').toLowerCase().includes(query)) : this.audit.items;
  }

  filteredArticles() {
    const query = this.search.trim().toLowerCase();
    return query ? this.support.articles.filter((item: any) => Object.values(item).join(' ').toLowerCase().includes(query)) : this.support.articles;
  }

  async filterAudit(category: string) {
    this.auditCategory = category;
    await this.load();
  }

  exportAudit() {
    const rows = this.filteredAudit();
    const csv = ['time,actor,action,category,target,detail', ...rows.map((item: any) =>
      [item.createdAt, item.actorEmail, item.action, item.category, item.target, item.detail]
        .map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')
    )].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'agentqa-audit-log.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async submitTicket() {
    this.submitting = true;
    this.error = '';
    try {
      const created: any = await this.api.createSupportTicket(this.ticket);
      this.support.tickets = [created, ...this.support.tickets];
      this.ticket = { subject: '', category: 'product', priority: 'normal', message: '' };
      this.notice = `Support ticket ${created._id.slice(-6).toUpperCase()} created.`;
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to create support ticket.';
    } finally {
      this.submitting = false;
    }
  }
}
