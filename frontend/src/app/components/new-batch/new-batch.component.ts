import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-new-batch',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, WorkspaceSidebarComponent],
  templateUrl: './new-batch.component.html',
  styleUrls: ['./new-batch.component.css']
})
export class NewBatchComponent {
  batchName = '';
  threshold = 70;
  step: 'upload' | 'configure' = 'upload';
  file: File | null = null;
  rubric = '';
  error = '';
  loading = false;
  formatsOpen = false;

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {
    this.step = this.route.snapshot.data['step'] === 'configure' ? 'configure' : 'upload';
  }

  continue() {
    if (!this.batchName.trim()) return this.error = 'Enter a batch name.';
    if (!this.file) return this.error = 'Select a CSV or JSON file.';
    this.error = '';
    this.step = 'configure';
  }

  selectFile(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0] || null;
    this.error = '';
  }

  removeFile() {
    this.file = null;
    this.step = 'upload';
  }

  downloadSample() {
    const csv = 'id,conversation\nconv-001,"Customer: My order is late. Agent: I will check the shipment and update you."\n';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'agentqa-sample.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async startEvaluation() {
    if (!this.file) return this.error = 'Select a file before starting evaluation.';
    this.loading = true;
    try {
      const form = new FormData();
      form.append('file', this.file);
      form.append('batchName', this.batchName);
      const result: any = await this.api.uploadBatch(form);
      this.router.navigate(['/batches', result.batch?._id || result.batchId || result._id]);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to upload and evaluate this batch.';
    } finally {
      this.loading = false;
    }
  }
}
