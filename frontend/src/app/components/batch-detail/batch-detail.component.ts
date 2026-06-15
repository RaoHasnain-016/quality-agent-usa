import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, WorkspaceSidebarComponent],
  templateUrl: './batch-detail.component.html',
  styleUrls: ['./batch-detail.component.css']
})
export class BatchDetailComponent implements OnInit {
  readonly id = this.route.snapshot.paramMap.get('id') || '';
  isHealthy = false;
  batch: any = null;
  notice = '';
  failedRows: any[] = [];
  healthyRows: any[] = [];

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.notice = '';
      this.batch = await this.api.getBatch(this.id);
      this.isHealthy = this.batch.avgScore >= 80;
      const result: any = await this.api.getConversations(this.id);
      const conversations = result.conversations || [];
      this.failedRows = conversations.filter((item: any) => item.flagged).map((item: any) => [
        item.externalId || item._id, new Date(item.createdAt).toLocaleString(), item.issues?.[0] || 'Quality issue',
        'AgentQA AI', `${item.overallScore}/100`, 'FLAGGED', item._id
      ]);
      this.healthyRows = conversations.map((item: any) => [
        item.externalId || item._id, item.summary || 'Evaluated conversation', String(item.overallScore ?? '-'),
        item.issues?.[0] || '-', item.reviewed ? 'Reviewed' : 'Pending', item._id
      ]);
    } catch (error: any) {
      this.notice = error?.error?.error || 'Unable to load batch.';
    }
  }

  openConversation(row: any[]) {
    this.router.navigate(['/conversations', row[6] || row[5]]);
  }

  async exportBatch() {
    const blob = await this.api.exportBatch(this.id) as Blob;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.batch?.name || 'batch'}-results.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.notice = 'Batch export downloaded.';
  }

  get totalCount() {
    return this.batch?.conversationCount || this.batch?.totalConversations || 0;
  }

  get flaggedCount() {
    return this.batch?.flaggedCount || 0;
  }

  get passedCount() {
    return Math.max(0, this.totalCount - this.flaggedCount);
  }
}
