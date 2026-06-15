import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = null;
  recentBatches: any[] = [];
  error = '';
  loading = true;
  refreshing = false;
  profileOpen = false;
  notificationsOpen = false;
  search = '';
  user: any = null;
  subscription: any = null;
  analysis: any = null;
  lastSyncedAt: Date | null = null;
  private syncTimer?: ReturnType<typeof setInterval>;
  private requestInFlight = false;
  readonly dimensions = [
    { label: 'Accuracy', value: 0, tone: 'good' },
    { label: 'Policy', value: 0, tone: 'warning' },
    { label: 'Resolution', value: 0, tone: 'info' },
    { label: 'Tone', value: 0, tone: 'good' },
    { label: 'Escalation', value: 0, tone: 'warning' }
  ];

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  async ngOnInit() {
    await this.loadDashboard();
    this.syncTimer = setInterval(() => this.loadDashboard(true), 15000);
  }

  ngOnDestroy() {
    if (this.syncTimer) clearInterval(this.syncTimer);
  }

  async loadDashboard(silent = false) {
    if (this.requestInFlight) return;
    this.requestInFlight = true;
    this.refreshing = !!this.stats;
    if (!silent) this.error = '';
    try {
      const [stats, recent, user, subscription, analysis]: any[] = await Promise.all([
        this.api.getDashboardStats(),
        this.api.getRecentBatches(),
        this.api.getCurrentUser(),
        this.api.getSubscription(),
        this.api.getAnalysisOverview()
      ]);
      this.stats = stats;
      const batches = recent.batches || recent || [];
      this.recentBatches = batches.map((batch: any) => ({
        ...batch,
        name: batch.name || batch.batchName,
        conversationCount: batch.conversationCount ?? batch.totalConversations ?? batch.totalCount ?? 0,
        flaggedCount: batch.flaggedCount ?? batch.failedCount ?? 0
      }));
      this.user = user;
      this.subscription = subscription;
      this.analysis = analysis;
      this.lastSyncedAt = new Date();
      const breakdown = this.analysis?.dimensions || this.stats?.issueBreakdown;
      if (breakdown) {
        this.dimensions.forEach(item => item.value = Math.round(breakdown[item.label.toLowerCase()] ?? item.value));
      }
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load live dashboard data.';
    } finally {
      this.loading = false;
      this.refreshing = false;
      this.requestInFlight = false;
    }
  }

  get totalEvaluations(): number {
    return this.stats?.totalConversations ?? this.stats?.totalEvaluations ?? 0;
  }

  get averageScore(): number {
    return Math.round(this.stats?.avgScore ?? 0);
  }

  get growthRate(): number {
    return this.stats?.growthRate ?? 0;
  }

  get flaggedConversations(): number {
    return this.stats?.flaggedConversations ?? 0;
  }

  get batchesThisMonth(): number {
    return this.stats?.batchesThisMonth ?? 0;
  }

  get trendData(): any[] {
    return this.stats?.trendData || [];
  }

  get trendLinePath(): string {
    const points = this.trendPoints;
    return points.length ? `M ${points.map(point => `${point.x} ${point.y}`).join(' L ')}` : '';
  }

  get trendAreaPath(): string {
    const points = this.trendPoints;
    return points.length ? `${this.trendLinePath} L ${points[points.length - 1].x} 248 L ${points[0].x} 248 Z` : '';
  }

  get trendLabels(): string[] {
    if (!this.trendData.length) return ['No data', '', ''];
    const labels = [this.trendData[0], this.trendData[Math.floor((this.trendData.length - 1) / 2)], this.trendData[this.trendData.length - 1]];
    return labels.map(item => new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  }

  private get trendPoints(): { x: number; y: number }[] {
    const rows = this.trendData;
    if (!rows.length) return [];
    const width = 600;
    return rows.map((row: any, index: number) => ({
      x: 28 + (rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width),
      y: 248 - (Math.max(0, Math.min(100, Number(row.score) || 0)) / 100) * 204
    }));
  }

  get displayBatches(): any[] {
    const rows = this.recentBatches;
    const query = this.search.trim().toLowerCase();
    return (query ? rows.filter(batch => batch.name?.toLowerCase().includes(query)) : rows).slice(0, 5);
  }

  get initials() {
    return (this.user?.company || this.user?.email || 'AQ').split(/[\s@._-]+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  }

  get fileUsagePercent() {
    return this.subscription ? Math.min(100, Math.round((this.subscription.usage.filesUsed / Math.max(1, this.subscription.usage.fileLimit)) * 100)) : 0;
  }

  get topIssues() {
    return this.analysis?.topIssues?.slice(0, 3) || [];
  }

  openBatch(batch: any) {
    if (batch._id) this.router.navigate(['/batches', batch._id]);
  }

  async logout() {
    try {
      await this.auth.signOut();
    } finally {
      await this.router.navigate(['/login']);
    }
  }

  /**
   * Get color for score display (cyan/amber/red)
   */
  getScoreColor(score: number): string {
    if (score >= 80) return '#06b6d4'; // Cyan
    if (score >= 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }

  /**
   * Get SVG dasharray for circular score indicator
   */
  getScoreDasharray(score: number): string {
    const circumference = 2 * Math.PI * 15.9;
    const dashLength = (score / 100) * circumference;
    return `${dashLength}, ${circumference}`;
  }

  /**
   * Get CSS class for score cell styling
   */
  getScoreClass(score: number): string {
    if (!score) return 'score-neutral';
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-warning';
    return 'score-bad';
  }

  getProgressWidth(current: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((current / total) * 100)}%`;
  }

  getEvalUsagePercent(): number {
    if (!this.stats) return 0;
    return Math.round((this.stats.evalUsed / this.stats.evalLimit) * 100);
  }

  getEvalUsageColor(): string {
    const percent = this.getEvalUsagePercent();
    if (percent >= 80) return 'red';
    if (percent >= 50) return 'amber';
    return 'green';
  }
}
