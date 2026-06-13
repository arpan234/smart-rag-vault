import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full'
  },
  {
    path: 'chat',
    title: 'AI Agent Chat | Smart RAG Vault',
    loadComponent: () => import('./features/chat/components/chat/chat.component').then(m => m.ChatComponent)
  },
  {
    path: 'vault',
    title: 'Knowledge Vault | Smart RAG Vault',
    loadComponent: () => import('./features/vault/components/vault/vault.component').then(m => m.VaultComponent)
  },
  {
    path: 'playground',
    title: 'RAG Playground | Smart RAG Vault',
    loadComponent: () => import('./features/playground/components/playground/playground.component').then(m => m.PlaygroundComponent)
  },
  {
    path: 'academy',
    title: 'RAG Academy | Smart RAG Vault',
    loadComponent: () => import('./features/academy/components/academy/academy.component').then(m => m.AcademyComponent)
  },
  {
    path: '**',
    redirectTo: 'chat'
  }
];
