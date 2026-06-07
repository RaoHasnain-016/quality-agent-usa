import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-onboarding-company',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './onboarding-company.component.html',
  styleUrls: ['./onboarding-company.component.css']
})
export class OnboardingCompanyComponent {
  company = 'Acme Corp';
}
