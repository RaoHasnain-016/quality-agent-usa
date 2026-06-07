import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  private readySubject = new BehaviorSubject<boolean>(false);
  ready$ = this.readySubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, user => {
      this.userSubject.next(user);
      this.readySubject.next(true);
    });
  }

  get isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    this.userSubject.next(credential.user);
    return credential.user;
  }

  async signOut() {
    await firebaseSignOut(this.auth);
    this.userSubject.next(null);
  }

  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }
    return await user.getIdToken();
  }

  async getAuthHeaders(): Promise<{ Authorization: string }> {
    const token = await this.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }
}
