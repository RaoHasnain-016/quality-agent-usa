import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

type BatchTone = 'good' | 'warning' | 'danger' | 'info';

type BatchRow = {
  id: string;
  name: string;
  createdAt: Date;
  conversations: number;
  avgScore: number;
  flagged: number;
  status: string;
  tone: BatchTone;
};

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, WorkspaceSidebarComponent],
  templateUrl: './batches.component.html',
  styleUrls: ['./batches.component.css']
})
export class BatchesComponent implements OnInit {
  batches: BatchRow[] = [];
  search = '';
  status = '';
  sortNewest = true;
  loading = true;
  refreshing = false;
  error = '';
  notice = '';
  user: any = null;
  subscription: any = null;
  page = 1;
  readonly pageSize = 10;
  total = 0;
  pages = 1;

  constructor(private router: Router, private api: ApiService, private auth: AuthService) {}

  async ngOnInit() {
    await Promise.all([this.loadBatches(), this.loadWorkspace()]);
  }

  async loadWorkspace() {
    try {
      [this.user, this.subscription] = await Promise.all([
        this.api.getCurrentUser(),
        this.api.getSubscription()
      ]);
    } catch {
      // The batch list remains usable if supplementary workspace metadata fails.
    }
  }

  async loadBatches(page = this.page) {
    this.refreshing = !this.loading;
    this.error = '';
    try {
      const response: any = await this.api.getBatches(page, this.pageSize, this.status);
      this.page = response.pagination?.page || page;
      this.total = response.pagination?.total || 0;
      this.pages = Math.max(1, response.pagination?.pages || 1);
      this.batches = (response.batches || []).map((batch: any) => {
        const avgScore = Math.round(Number(batch.avgScore || 0) * 10) / 10;
        const status = batch.status || 'pending';
        return {
          id: batch._id,
          name: batch.name || batch.batchName || 'Untitled batch',
          createdAt: new Date(batch.createdAt || batch.uploadedAt),
          conversations: batch.totalConversations ?? batch.totalCount ?? 0,
          avgScore,
          flagged: batch.flaggedCount ?? batch.failedCount ?? 0,
          status,
          tone: status === 'failed' ? 'danger' : status === 'processing' || status === 'pending' ? 'info' : avgScore < 70 ? 'warning' : 'good'
        };
      });
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load evaluation batches.';
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  get visibleBatches() {
    const query = this.search.trim().toLowerCase();
    return this.batches
      .filter(batch => !query || batch.name.toLowerCase().includes(query))
      .sort((a, b) => this.sortNewest
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime());
  }

  get completedCount() {
    return this.batches.filter(batch => batch.status === 'complete').length;
  }

  get flaggedCount() {
    return this.batches.reduce((total, batch) => total + batch.flagged, 0);
  }

  get averageScore() {
    const scored = this.batches.filter(batch => batch.avgScore > 0);
    return scored.length ? Math.round(scored.reduce((total, batch) => total + batch.avgScore, 0) / scored.length) : 0;
  }

  get initials() {
    return (this.user?.company || this.user?.email || 'AQ').split(/[\s@._-]+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  }

  get planName() {
    return this.subscription?.plan?.name || this.user?.plan || 'Free';
  }

  cycleStatus() {
    const values = ['', 'complete', 'processing', 'pending', 'failed'];
    this.status = values[(values.indexOf(this.status) + 1) % values.length];
    this.loadBatches(1);
  }

  openBatch(batch: BatchRow) {
    this.router.navigate(['/batches', batch.id]);
  }

  async deleteBatch(batch: BatchRow, event: Event) {
    event.stopPropagation();
    if (!window.confirm(`Delete "${batch.name}" and all of its conversations?`)) return;
    try {
      await this.api.deleteBatch(batch.id);
      this.notice = `${batch.name} was deleted.`;
      await this.loadBatches(this.page);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to delete batch.';
    }
  }

  async changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > this.pages || nextPage === this.page) return;
    await this.loadBatches(nextPage);
  }

  async logout() {
    try {
      await this.auth.signOut();
    } finally {
      await this.router.navigate(['/login']);
    }
  }
}
