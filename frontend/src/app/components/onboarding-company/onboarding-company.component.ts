import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-onboarding-company',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './onboarding-company.component.html',
  styleUrls: ['./onboarding-company.component.css']
})
export class OnboardingCompanyComponent {
  company = 'Acme Corp';
  policy = '';
  error = '';
  loading = false;

  constructor(private api: ApiService, private router: Router) {}

  async continue() {
    this.loading = true;
    try {
      await this.api.updateSettings({ company: this.company, companyPolicy: this.policy });
      this.router.navigate(['/onboarding/threshold']);
    } catch (error: any) {
      this.error = error?.error?.error || 'Unable to save company settings.';
    } finally {
      this.loading = false;
    }
  }
}
