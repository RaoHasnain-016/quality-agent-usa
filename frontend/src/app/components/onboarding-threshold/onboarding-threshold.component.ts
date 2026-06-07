import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-onboarding-threshold',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './onboarding-threshold.component.html',
  styleUrls: ['./onboarding-threshold.component.css']
})
export class OnboardingThresholdComponent {
  threshold = 70;
}
