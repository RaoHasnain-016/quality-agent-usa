import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, from, Subscription, timer } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

type AnalysisView = 'overview' | 'trends' | 'dimensions' | 'failures' | 'compare' | 'live';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit, OnDestroy {
  view: AnalysisView = 'overview';
  overview: any = { summary: {}, dimensions: {}, statuses: [], topIssues: [] };
  trends: any[] = [];
  distribution: any[] = [];
  failures: any = { clusters: [], priority: [] };
  batches: any[] = [];
  activity: any = { batches: [], conversations: [] };
  days = 30;
  compareA = '';
  compareB = '';
  loading = true;
  error = '';
  notice = '';
  live = true;
  private routeSub?: Subscription;
  private liveSub?: Subscription;

  readonly dimensionLabels: Record<string, string> = {
    accuracy: 'Accuracy', policy: 'Policy adherence', resolution: 'Resolution',
    tone: 'Tone & empathy', escalation: 'Escalation logic'
  };

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.routeSub = this.route.data.subscribe(data => {
      this.view = data['view'] || 'overview';
      this.load();
      this.configureLive();
    });
  }

  ngOnDestroy() { this.routeSub?.unsubscribe(); this.liveSub?.unsubscribe(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const result: any = await forkJoin({
        overview: from(this.api.getAnalysisOverview()),
        trends: from(this.api.getAnalysisTrends(this.days)),
        distribution: from(this.api.getAnalysisDistribution()),
        failures: from(this.api.getAnalysisFailures()),
        batches: from(this.api.getAnalysisBatches()),
        activity: from(this.api.getAnalysisActivity())
      }).toPromise();
      Object.assign(this, result);
      if (!this.compareA && this.batches[0]) this.compareA = this.batches[0]._id;
      if (!this.compareB && this.batches[1]) this.compareB = this.batches[1]._id;
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load quality analysis.';
    } finally {
      this.loading = false;
    }
  }

  configureLive() {
    this.liveSub?.unsubscribe();
    if (this.view === 'live' && this.live) {
      this.liveSub = timer(0, 5000).subscribe(() => this.refreshActivity());
    }
  }

  async refreshActivity() {
    try { this.activity = await this.api.getAnalysisActivity(); } catch { /* Retain the last successful snapshot. */ }
  }

  toggleLive() { this.live = !this.live; this.configureLive(); }
  changeDays() { this.load(); }
  go(view: AnalysisView) { this.router.navigate([view === 'overview' ? '/analysis' : `/analysis/${view}`]); }
  openConversation(row: any) { this.router.navigate(['/conversations', row._id]); }
  openBatch(row: any) { this.router.navigate(['/batches', row._id]); }

  get summary() { return this.overview.summary || {}; }
  get dimensions() { return Object.entries(this.overview.dimensions || {}).filter(([key]) => key !== '_id').map(([key, value]) => ({ key, label: this.dimensionLabels[key] || key, value: Math.round(Number(value || 0)) })); }
  get flaggedRate() { return this.summary.total ? Math.round((this.summary.flagged / this.summary.total) * 100) : 0; }
  get reviewRate() { return this.summary.flagged ? Math.round((this.summary.reviewed / this.summary.flagged) * 100) : 0; }
  get maxTrendVolume() { return Math.max(1, ...this.trends.map(item => item.volume || 0)); }
  get maxDistribution() { return Math.max(1, ...this.distribution.map(item => item.count || 0)); }
  get batchA() { return this.batches.find(item => item._id === this.compareA); }
  get batchB() { return this.batches.find(item => item._id === this.compareB); }
  delta(a: number, b: number) { return Math.round((Number(a || 0) - Number(b || 0)) * 10) / 10; }
  tone(value: number) { return value >= 80 ? 'good' : value >= 60 ? 'warn' : 'bad'; }
  progress(batch: any) { return batch.totalConversations ? Math.round((batch.processedCount / batch.totalConversations) * 100) : batch.status === 'complete' ? 100 : 0; }

  exportAnalysis() {
    const rows = [['Metric', 'Value'], ['Total evaluated', this.summary.total || 0], ['Average score', Math.round(this.summary.avgScore || 0)], ['Flagged', this.summary.flagged || 0], ...this.dimensions.map(item => [item.label, item.value])];
    const csv = rows.map(row => row.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'agentqa-analysis.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    this.notice = 'Analysis export downloaded.';
  }
}
