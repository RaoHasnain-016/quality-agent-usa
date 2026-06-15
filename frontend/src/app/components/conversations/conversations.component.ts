import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.css']
})
export class ConversationsComponent implements OnInit, OnDestroy {
  rows: any[] = [];
  batches: any[] = [];
  summary: any = { total: 0, flagged: 0, reviewed: 0, overridden: 0, avgScore: 0, issues: [] };
  selected = new Set<string>();
  search = '';
  status = '';
  batchId = '';
  scoreRange = '';
  issue = '';
  sort = 'priority';
  page = 1;
  readonly limit = 15;
  total = 0;
  pages = 1;
  loading = true;
  actionBusy = false;
  error = '';
  notice = '';
  lastSyncedAt: Date | null = null;
  private syncTimer?: ReturnType<typeof setInterval>;
  private requestInFlight = false;

  constructor(private api: ApiService, private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    this.status = this.route.snapshot.data['status'] || '';
    await Promise.all([this.load(), this.loadReferenceData()]);
    this.syncTimer = setInterval(() => this.sync(), 15000);
  }

  ngOnDestroy() {
    if (this.syncTimer) clearInterval(this.syncTimer);
  }

  async sync() {
    await Promise.all([this.load(this.page, true), this.loadReferenceData()]);
  }

  async loadReferenceData() {
    try {
      const [summary, batches]: any[] = await Promise.all([this.api.getConversationSummary(), this.api.getBatches(1, 100)]);
      this.summary = summary;
      this.batches = batches.batches || [];
    } catch {
      // Main list exposes its own error state.
    }
  }

  async load(page = this.page, silent = false) {
    if (this.requestInFlight) return;
    this.requestInFlight = true;
    this.loading = true;
    if (!silent) {
      this.error = '';
      this.notice = '';
    }
    try {
      const params: Record<string, string | number> = { page, limit: this.limit, sort: this.sort };
      if (this.search.trim()) params['q'] = this.search.trim();
      if (this.status) params['status'] = this.status;
      if (this.batchId) params['batchId'] = this.batchId;
      if (this.issue) params['issue'] = this.issue;
      if (this.scoreRange === 'critical') params['maxScore'] = 49;
      if (this.scoreRange === 'warning') { params['minScore'] = 50; params['maxScore'] = 79; }
      if (this.scoreRange === 'healthy') params['minScore'] = 80;
      const response: any = await this.api.listConversations(params);
      this.rows = response.conversations || [];
      this.page = response.pagination?.page || page;
      this.total = response.pagination?.total || 0;
      this.pages = Math.max(1, response.pagination?.pages || 1);
      this.selected.clear();
      this.error = '';
      this.lastSyncedAt = new Date();
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load conversations.';
    } finally {
      this.loading = false;
      this.requestInFlight = false;
    }
  }

  get selectedCount() { return this.selected.size; }
  get allSelected() { return !!this.rows.length && this.rows.every(row => this.selected.has(row._id)); }

  toggle(row: any, event: Event) {
    event.stopPropagation();
    this.selected.has(row._id) ? this.selected.delete(row._id) : this.selected.add(row._id);
  }

  toggleAll() {
    if (this.allSelected) this.selected.clear();
    else this.rows.forEach(row => this.selected.add(row._id));
  }

  open(row: any) {
    this.router.navigate(['/conversations', row._id]);
  }

  setStatus(status: string) {
    this.status = status;
    this.load(1);
  }

  clearFilters() {
    this.search = '';
    this.status = '';
    this.batchId = '';
    this.scoreRange = '';
    this.issue = '';
    this.sort = 'priority';
    this.load(1);
  }

  async bulkReview() {
    if (!this.selected.size) return;
    this.actionBusy = true;
    try {
      const result: any = await this.api.bulkReviewConversations([...this.selected]);
      this.notice = `${result.reviewed} conversations marked as reviewed.`;
      await Promise.all([this.load(this.page), this.loadReferenceData()]);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to review selected conversations.';
    } finally {
      this.actionBusy = false;
    }
  }

  exportVisible() {
    const header = ['ID', 'Batch', 'Score', 'Flagged', 'Reviewed', 'Issues', 'Summary'];
    const rows = this.rows.map(row => [
      row.externalId || row._id,
      row.batchId?.name || row.batchId?.batchName || '',
      row.overridden ? row.overrideScore : row.overallScore,
      row.flagged,
      row.reviewed,
      (row.issues || []).join('; '),
      row.summary || ''
    ]);
    const csv = [header, ...rows].map(line => line.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'agentqa-conversations.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    this.notice = 'Visible conversations exported.';
  }

  score(row: any) { return row.overridden ? row.overrideScore : row.overallScore; }
  scoreTone(row: any) { const score = this.score(row); return score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad'; }
  batchName(row: any) { return row.batchId?.name || row.batchId?.batchName || 'Unknown batch'; }
}
