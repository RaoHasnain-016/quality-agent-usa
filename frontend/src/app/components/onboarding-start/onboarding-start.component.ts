import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-onboarding-start',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './onboarding-start.component.html',
  styleUrls: ['./onboarding-start.component.css']
})
export class OnboardingStartComponent {}
