import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-new-batch',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './new-batch.component.html',
  styleUrls: ['./new-batch.component.css']
})
export class NewBatchComponent {
  batchName = '';
  threshold = 70;
  step: 'upload' | 'configure' = 'upload';

  constructor(private route: ActivatedRoute, private router: Router) {
    this.step = this.route.snapshot.data['step'] === 'configure' ? 'configure' : 'upload';
  }

  continue() {
    this.router.navigate(['/batches/new/configure']);
  }

  startEvaluation() {
    this.router.navigate(['/batches/evaluating']);
  }
}
