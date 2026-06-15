import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

type PageMode = 'table' | 'research' | 'analysis' | 'live' | 'report' | 'settings' | 'form';

interface ProductPageConfig {
  eyebrow: string;
  title: string;
  description: string;
  mode: PageMode;
  primary?: string;
  metricLabel?: string;
  metricValue?: string;
}

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, WorkspaceSidebarComponent],
  templateUrl: './product-page.component.html',
  styleUrls: ['./product-page.component.css']
})
export class ProductPageComponent implements OnInit, OnDestroy {
  config: ProductPageConfig = {
    eyebrow: 'Workspace',
    title: 'AgentQA',
    description: 'Operational workspace',
    mode: 'table'
  };
  search = '';
  selectedTab = 'Overview';
  liveProgress = 38;
  liveEvents = 128;
  loading = true;
  actionBusy = false;
  notice = '';
  noticeTone: 'success' | 'error' = 'success';
  projectName = '';
  objective = '';
  notificationsOpen = false;
  statusFilter = 'All';
  dateFilter = 'Last 30 days';
  private routeSub?: Subscription;
  private timer?: ReturnType<typeof setInterval>;

  readonly tabs = ['Overview', 'Activity', 'Insights'];
  metrics = [
    { label: 'Evaluated', value: '24,892', delta: '+12.4%', tone: 'cyan' },
    { label: 'Pass rate', value: '91.8%', delta: '+3.1%', tone: 'green' },
    { label: 'Needs review', value: '184', delta: '-8.2%', tone: 'amber' },
    { label: 'Critical', value: '27', delta: '-2.4%', tone: 'red' }
  ];
  rows: any[] = [
    { name: 'Support escalation review', owner: 'Quality team', status: 'In review', score: 64, updated: '2 min ago' },
    { name: 'Billing policy regression', owner: 'Research lab', status: 'Ready', score: 92, updated: '18 min ago' },
    { name: 'Refund intent benchmark', owner: 'Evaluation ops', status: 'Running', score: 78, updated: '34 min ago' },
    { name: 'Tone and empathy audit', owner: 'CX operations', status: 'Ready', score: 88, updated: '1 hr ago' },
    { name: 'API support failure set', owner: 'Platform QA', status: 'Critical', score: 41, updated: '3 hr ago' }
  ];
  researchCards: any[] = [
    { title: 'Holiday returns policy', detail: '12 sources · Updated today', tag: 'Policy research', score: 96 },
    { title: 'Escalation trigger study', detail: '8 sources · 42 evidence items', tag: 'Behavior study', score: 89 },
    { title: 'Customer frustration patterns', detail: '1,420 conversations', tag: 'Conversation study', score: 84 },
    { title: 'Competitor support benchmarks', detail: '6 datasets · Updated yesterday', tag: 'Benchmark', score: 91 },
    { title: 'Hallucination root causes', detail: '218 failures analyzed', tag: 'Failure research', score: 72 },
    { title: 'Response latency impact', detail: '30-day observation', tag: 'Performance', score: 87 }
  ];
  settings = [
    { label: 'Workspace name', value: 'AgentQA Production' },
    { label: 'Default evaluation model', value: 'GPT-4.1 Judge' },
    { label: 'Review threshold', value: 'Below 70 / 100' },
    { label: 'Data retention', value: '90 days' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.routeSub = this.route.data.subscribe(async data => {
      this.config = data as ProductPageConfig;
      this.selectedTab = 'Overview';
      this.configureTimer();
      await this.loadRealData();
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    if (this.timer) clearInterval(this.timer);
  }

  filteredRows() {
    const query = this.search.trim().toLowerCase();
    let result = this.rows;
    if (this.statusFilter !== 'All') result = result.filter(row => row.status === this.statusFilter);
    return query ? result.filter(row => Object.values(row).join(' ').toLowerCase().includes(query)) : result;
  }

  async runPrimaryAction() {
    if (this.config.primary?.toLowerCase().includes('upgrade') || this.config.primary?.toLowerCase().includes('manage plan')) this.router.navigate(['/pricing']);
    else if (this.config.mode === 'research') this.router.navigate(['/research/new']);
    else if (this.config.mode === 'analysis') this.router.navigate(['/analysis/live']);
    else if (this.config.mode === 'report') this.router.navigate(['/reports/new']);
    else if (this.config.mode === 'table') this.router.navigate(['/batches/new']);
    else if (this.config.mode === 'settings') await this.saveSettings();
    else if (this.config.mode === 'form') await this.startWorkflow();
  }

  async loadRealData() {
    this.loading = true;
    try {
      if (['analysis', 'table', 'live'].includes(this.config.mode)) {
        const data: any = await this.api.getAnalysisOverview();
        const summary = data.summary || {};
        this.metrics = [
          { label: 'Evaluated', value: String(summary.total ?? 0), delta: 'Live MongoDB', tone: 'cyan' },
          { label: 'Average score', value: `${Math.round(summary.avgScore ?? 0)}%`, delta: 'All evaluations', tone: 'green' },
          { label: 'Needs review', value: String(summary.flagged ?? 0), delta: 'Flagged records', tone: 'amber' },
          { label: 'Reviewed', value: String(summary.reviewed ?? 0), delta: 'Human decisions', tone: 'red' }
        ];
        this.rows = (data.topIssues || []).map((issue: any, index: number) => ({
          name: issue._id,
          owner: 'AI evaluator',
          status: issue.avgScore < 60 ? 'Critical' : issue.avgScore < 80 ? 'In review' : 'Ready',
          score: Math.round(issue.avgScore),
          updated: `${issue.count} signals`,
          id: index
        }));
      } else if (this.config.mode === 'research') {
        const studies: any = await this.api.getResearchStudies();
        this.researchCards = studies.map((study: any) => ({
          id: study._id,
          title: study.title,
          detail: `${study.sampleSize || 0} conversations - ${study.findings?.length || 0} findings`,
          tag: study.status,
          score: study.confidence || 0
        }));
      } else if (this.config.mode === 'report') {
        const report: any = await this.api.getExecutiveReport();
        this.metrics = [
          { label: 'Evaluated', value: String(report.summary?.total ?? 0), delta: 'Executive report', tone: 'cyan' },
          { label: 'Average score', value: `${Math.round(report.summary?.average ?? 0)}%`, delta: 'Quality score', tone: 'green' },
          { label: 'Flagged', value: String(report.summary?.flagged ?? 0), delta: 'Requires action', tone: 'amber' },
          { label: 'Batches', value: String(report.batches?.length ?? 0), delta: 'Included runs', tone: 'red' }
        ];
      } else if (this.config.mode === 'settings') {
        const settings: any = await this.api.getSettings();
        this.settings = [
          { label: 'Workspace name', value: settings.company || '' },
          { label: 'Alert email', value: settings.alertEmail || settings.email || '' },
          { label: 'Review threshold', value: String(settings.alertThreshold ?? 70) },
          { label: 'Plan', value: settings.plan || 'free' }
        ];
      }
    } catch (error: any) {
      this.showNotice(error?.error?.error || 'Unable to load live workspace data.', 'error');
    } finally {
      this.loading = false;
    }
  }

  async saveSettings() {
    this.actionBusy = true;
    try {
      await this.api.updateSettings({
        company: this.settings[0].value,
        alertEmail: this.settings[1].value,
        alertThreshold: Number(this.settings[2].value)
      });
      this.showNotice('Workspace settings saved.');
    } catch (error: any) {
      this.showNotice(error?.error?.error || 'Unable to save settings.', 'error');
    } finally {
      this.actionBusy = false;
    }
  }

  async startWorkflow() {
    if (!this.projectName.trim()) return this.showNotice('Enter a project name first.', 'error');
    this.actionBusy = true;
    try {
      const study: any = await this.api.createResearchStudy({ title: this.projectName, objective: this.objective });
      await this.api.runResearchStudy(study._id);
      this.showNotice('Research study completed and saved.');
      this.router.navigate(['/research', study._id]);
    } catch (error: any) {
      this.showNotice(error?.error?.error || 'Unable to start workflow.', 'error');
    } finally {
      this.actionBusy = false;
    }
  }

  exportView() {
    const csv = ['name,owner,status,score,updated', ...this.filteredRows().map(row =>
      [row.name, row.owner, row.status, row.score, row.updated].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    )].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `${this.config.title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showNotice('Export downloaded.');
  }

  openStudy(card: any) {
    if (card.id) this.router.navigate(['/research', card.id]);
  }

  stopAnalysis() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.showNotice('Live analysis paused.');
  }

  cycleStatus() {
    const values = ['All', 'Ready', 'In review', 'Critical'];
    this.statusFilter = values[(values.indexOf(this.statusFilter) + 1) % values.length];
  }

  async signOut() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }

  showNotice(message: string, tone: 'success' | 'error' = 'success') {
    this.notice = message;
    this.noticeTone = tone;
    setTimeout(() => { if (this.notice === message) this.notice = ''; }, 3500);
  }

  private configureTimer() {
    if (this.timer) clearInterval(this.timer);
    if (this.config.mode !== 'live') return;
    this.liveProgress = 38;
    this.liveEvents = 128;
    this.timer = setInterval(() => {
      this.liveProgress = this.liveProgress >= 96 ? 38 : this.liveProgress + 1;
      this.liveEvents += Math.floor(Math.random() * 4) + 1;
    }, 900);
  }
}
