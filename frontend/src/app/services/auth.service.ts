import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, GoogleAuthProvider, getAuth, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

export interface AgentQaUser {
  id: string;
  email: string;
  company: string;
  plan: string;
  evalUsed: number;
  evalLimit: number;
  batchUploadsUsed: number;
  batchUploadLimit: number;
  subscriptionStatus: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'agentqa_token';
  private readonly userKey = 'agentqa_user';
  private userSubject = new BehaviorSubject<AgentQaUser | null>(this.readUser());
  private readySubject = new BehaviorSubject<boolean>(true);
  user$ = this.userSubject.asObservable();
  ready$ = this.readySubject.asObservable();
  private firebaseApp: FirebaseApp | null = null;
  private firebaseAuth: Auth | null = null;

  constructor(private http: HttpClient) {}

  get isLoggedIn(): boolean {
    return !!this.getStoredToken();
  }

  async signIn(email: string, password: string) {
    const response: any = await firstValueFrom(
      this.http.post(`${environment.apiBaseUrl}/api/auth/login`, { email, password })
    );
    this.storeSession(response.token, response.user);
    return response.user;
  }

  async signUp(email: string, password: string, company = '') {
    const response: any = await firstValueFrom(
      this.http.post(`${environment.apiBaseUrl}/api/auth/signup`, { email, password, company })
    );
    this.storeSession(response.token, response.user);
    return response.user;
  }

  async signInWithGoogle() {
    const auth = this.getFirebaseAuth();
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const firebaseToken = await credential.user.getIdToken();
    const response: any = await firstValueFrom(
      this.http.post(
        `${environment.apiBaseUrl}/api/auth/firebase-session`,
        {},
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      )
    );
    this.storeSession(response.token, response.user);
    return response.user;
  }

  async signOut() {
    if (this.firebaseAuth?.currentUser) {
      await firebaseSignOut(this.firebaseAuth);
    }
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
  }

  async getIdToken(): Promise<string | null> {
    return this.getStoredToken();
  }

  async getAuthHeaders(): Promise<{ Authorization: string }> {
    return { Authorization: `Bearer ${this.getStoredToken() ?? ''}` };
  }

  private storeSession(token: string, user: AgentQaUser) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.userSubject.next(user);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private readUser(): AgentQaUser | null {
    try {
      const value = localStorage.getItem(this.userKey);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  private getFirebaseAuth(): Auth {
    if (environment.firebase.apiKey.startsWith('YOUR_')) {
      throw new Error('Google login requires Firebase web credentials in environment.ts.');
    }

    if (!this.firebaseApp) {
      this.firebaseApp = getApps()[0] ?? initializeApp(environment.firebase);
      this.firebaseAuth = getAuth(this.firebaseApp);
    }

    return this.firebaseAuth!;
  }
}
