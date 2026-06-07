import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: any = null;
  recentBatches: any[] = [];
  error = '';
  loading = true;
  readonly dimensions = [
    { label: 'Accuracy', value: 82, tone: 'good' },
    { label: 'Policy', value: 68, tone: 'warning' },
    { label: 'Resolution', value: 78, tone: 'info' },
    { label: 'Tone', value: 88, tone: 'good' },
    { label: 'Escalation', value: 71, tone: 'warning' }
  ];

  readonly fallbackBatches = [
    {
      name: 'Customer_Support_Q3_W2',
      createdAt: '2023-10-24',
      conversationCount: 1200,
      avgScore: 84.2,
      flaggedCount: 12,
      status: 'complete'
    },
    {
      name: 'Sales_Inbound_Oct_p1',
      createdAt: '2023-10-25',
      conversationCount: 850,
      avgScore: null,
      flaggedCount: null,
      status: 'processing'
    },
    {
      name: 'Tech_Escalations_Archive',
      createdAt: '2023-10-21',
      conversationCount: 432,
      avgScore: 62.1,
      flaggedCount: 89,
      status: 'failed'
    }
  ];

  constructor() {}

  async ngOnInit() {
    this.stats = {
      totalConversations: 12450,
      avgScore: 78,
      growthRate: 2.4,
      flaggedConversations: 234,
      batchesThisMonth: 18
    };
    this.recentBatches = this.fallbackBatches;
    this.loading = false;
  }

  get totalEvaluations(): number {
    return this.stats?.totalConversations ?? this.stats?.totalEvaluations ?? 12450;
  }

  get averageScore(): number {
    return Math.round(this.stats?.avgScore ?? 78);
  }

  get growthRate(): number {
    return this.stats?.growthRate ?? 2.4;
  }

  get flaggedConversations(): number {
    return this.stats?.flaggedConversations ?? 234;
  }

  get batchesThisMonth(): number {
    return this.stats?.batchesThisMonth ?? 18;
  }

  get displayBatches(): any[] {
    return this.recentBatches.length ? this.recentBatches.slice(0, 3) : this.fallbackBatches;
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
