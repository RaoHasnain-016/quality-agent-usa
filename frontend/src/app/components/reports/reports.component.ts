import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  mode: 'library' | 'new' | 'scheduled' | 'detail' = 'library';
  reports: any[] = [];
  summary: any = { total: 0, statuses: [], types: [] };
  report: any = null;
  batches: any[] = [];
  selectedBatches = new Set<string>();
  title = '';
  type = 'executive';
  period = 'All time';
  schedule = 'none';
  recipients = '';
  search = '';
  status = '';
  loading = true;
  busy = false;
  notice = '';
  error = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.mode = id ? 'detail' : this.route.snapshot.data['mode'] || 'library';
    if (id) await this.loadDetail(id);
    else await this.loadWorkspace();
  }

  async loadWorkspace() {
    this.loading = true;
    try {
      const effectiveStatus = this.mode === 'scheduled' ? 'scheduled' : this.status;
      const [reports, summary, batches]: any[] = await Promise.all([this.api.getReports(effectiveStatus), this.api.getReportSummary(), this.api.getBatches(1, 100)]);
      this.reports = reports;
      this.summary = summary;
      this.batches = batches.batches || [];
    } catch (error: any) { this.error = error?.error?.error || 'Unable to load reports.'; }
    finally { this.loading = false; }
  }

  async loadDetail(id: string) {
    this.loading = true;
    try {
      this.report = await this.api.getReport(id);
      this.schedule = this.report.schedule;
      this.recipients = (this.report.recipients || []).join(', ');
    } catch (error: any) { this.error = error?.error?.error || 'Unable to load report.'; }
    finally { this.loading = false; }
  }

  count(status: string) { return this.summary.statuses?.find((item: any) => item._id === status)?.count || 0; }
  reportInitial(report: any) { return String(report?.type || 'R').charAt(0).toUpperCase(); }
  get filteredReports() { const q = this.search.toLowerCase().trim(); return q ? this.reports.filter(item => `${item.title} ${item.type}`.toLowerCase().includes(q)) : this.reports; }
  get dimensions() { return Object.entries(this.report?.dimensions || {}).filter(([key]) => key !== '_id').map(([key, value]) => ({ label: key, value: Math.round(Number(value || 0)) })); }
  toggleBatch(id: string) { this.selectedBatches.has(id) ? this.selectedBatches.delete(id) : this.selectedBatches.add(id); }

  async create() {
    if (!this.title.trim()) return this.error = 'Enter a report title.';
    this.busy = true;
    try {
      const report: any = await this.api.createReport({ title: this.title, type: this.type, period: this.period, schedule: this.schedule, recipients: this.parseRecipients(), sourceBatchIds: [...this.selectedBatches] });
      await this.router.navigate(['/reports', report._id]);
    } catch (error: any) { this.error = error?.error?.error || 'Unable to generate report.'; }
    finally { this.busy = false; }
  }

  async saveSchedule() {
    this.busy = true;
    try {
      this.report = await this.api.scheduleReport(this.report._id, this.schedule, this.parseRecipients());
      this.notice = 'Delivery schedule saved.';
    } catch (error: any) { this.error = error?.error?.error || 'Unable to save schedule.'; }
    finally { this.busy = false; }
  }

  parseRecipients() { return this.recipients.split(',').map(value => value.trim()).filter(Boolean); }
  open(report: any) { this.router.navigate(['/reports', report._id]); }
  setStatus(status: string) { this.status = status; this.loadWorkspace(); }

  async delete(report: any, event?: Event) {
    event?.stopPropagation();
    if (!window.confirm(`Delete "${report.title}"?`)) return;
    await this.api.deleteReport(report._id);
    if (this.mode === 'detail') await this.router.navigate(['/reports']);
    else await this.loadWorkspace();
  }

  download() {
    const report = this.report;
    const text = `${report.title}\nGenerated: ${new Date(report.generatedAt).toLocaleString()}\n\nExecutive summary\nAverage quality: ${Math.round(report.summary?.average || 0)}/100\nEvaluated: ${report.summary?.total || 0}\nFlagged: ${report.summary?.flagged || 0}\nReviewed: ${report.summary?.reviewed || 0}\n\nRecommendations\n${(report.recommendations || []).map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')}`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); link.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`; link.click(); URL.revokeObjectURL(link.href);
    this.notice = 'Report downloaded.';
  }
}
