import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-onboarding-threshold',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './onboarding-threshold.component.html',
  styleUrls: ['./onboarding-threshold.component.css']
})
export class OnboardingThresholdComponent {
  threshold = 70;
  loading = false;

  constructor(private api: ApiService, private router: Router) {}

  async complete() {
    this.loading = true;
    try {
      await this.api.updateSettings({ alertThreshold: this.threshold });
      this.router.navigate(['/dashboard']);
    } finally {
      this.loading = false;
    }
  }
}
