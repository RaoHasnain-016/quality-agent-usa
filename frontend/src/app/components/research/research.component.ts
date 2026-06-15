import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceSidebarComponent],
  templateUrl: './research.component.html',
  styleUrls: ['./research.component.css']
})
export class ResearchComponent implements OnInit {
  mode: 'library' | 'new' | 'detail' = 'library';
  studies: any[] = [];
  batches: any[] = [];
  summary: any = { statuses: [], avgConfidence: 0, totalSamples: 0, totalFindings: 0, topFindings: [] };
  study: any = null;
  title = '';
  objective = '';
  selectedBatches = new Set<string>();
  status = '';
  search = '';
  loading = true;
  actionBusy = false;
  notice = '';
  error = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.mode = id ? 'detail' : this.route.snapshot.data['mode'] === 'new' ? 'new' : 'library';
    if (id) await this.loadDetail(id);
    else await this.loadWorkspace();
  }

  async loadWorkspace() {
    this.loading = true;
    try {
      const [studies, summary, batches]: any[] = await Promise.all([
        this.api.getResearchStudies(this.status),
        this.api.getResearchSummary(),
        this.api.getBatches(1, 100)
      ]);
      this.studies = studies;
      this.summary = summary;
      this.batches = batches.batches || [];
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load research workspace.';
    } finally {
      this.loading = false;
    }
  }

  async loadDetail(id: string) {
    this.loading = true;
    try {
      this.study = await this.api.getResearchStudy(id);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to load research study.';
    } finally {
      this.loading = false;
    }
  }

  get filteredStudies() {
    const q = this.search.trim().toLowerCase();
    return q ? this.studies.filter(study => `${study.title} ${study.objective}`.toLowerCase().includes(q)) : this.studies;
  }

  count(status: string) {
    return this.summary.statuses?.find((item: any) => item._id === status)?.count || 0;
  }

  toggleBatch(id: string) {
    this.selectedBatches.has(id) ? this.selectedBatches.delete(id) : this.selectedBatches.add(id);
  }

  async createStudy(run = false) {
    if (!this.title.trim()) return this.error = 'Enter a clear research title.';
    if (!this.objective.trim()) return this.error = 'Describe the investigation objective.';
    this.actionBusy = true;
    this.error = '';
    try {
      const study: any = await this.api.createResearchStudy({
        title: this.title,
        objective: this.objective,
        sourceBatchIds: [...this.selectedBatches]
      });
      if (run) await this.api.runResearchStudy(study._id);
      await this.router.navigate(['/research', study._id]);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to create research study.';
    } finally {
      this.actionBusy = false;
    }
  }

  async runStudy() {
    this.actionBusy = true;
    try {
      this.study = await this.api.runResearchStudy(this.study._id);
      this.notice = 'Research completed using current MongoDB evidence.';
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to run research study.';
    } finally {
      this.actionBusy = false;
    }
  }

  async deleteStudy(study: any, event?: Event) {
    event?.stopPropagation();
    if (!window.confirm(`Delete "${study.title}"?`)) return;
    await this.api.deleteResearchStudy(study._id);
    if (this.mode === 'detail') await this.router.navigate(['/research']);
    else await this.loadWorkspace();
  }

  openStudy(study: any) { this.router.navigate(['/research', study._id]); }
  setStatus(status: string) { this.status = status; this.loadWorkspace(); }

  exportStudy() {
    const content = `${this.study.title}\n\nObjective\n${this.study.objective}\n\nSummary\n${this.study.summary}\n\nFindings\n${(this.study.findings || []).map((f: any, i: number) => `${i + 1}. ${f.title}\n${f.evidence}\nConfidence: ${f.confidence}% | Severity: ${f.severity}`).join('\n\n')}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.download = `${this.study.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-research.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
