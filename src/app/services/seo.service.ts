import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);

  init() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const currentUrl = this.router.url;
      let description = 'Learn and play with Retrieval-Augmented Generation (RAG). Upload documents, trace vector database cosine similarities, and prompt LLMs with retrieved context.';
      
      if (currentUrl.includes('chat')) {
        description = 'Chat with an AI Agent using Retrieval-Augmented Generation (RAG). Upload your own files to ground responses with accurate citations and zero hallucinations.';
      } else if (currentUrl.includes('vault')) {
        description = 'Manage your RAG Knowledge Vault. Upload PDF/text files, split them into overlapping visual chunks, and compute vector embeddings stored locally in IndexedDB.';
      } else if (currentUrl.includes('playground')) {
        description = 'Interactive RAG Playground. Visualise step-by-step how text is tokenized, mapped to vectors, searched via Cosine Similarity, and compiled into prompts.';
      } else if (currentUrl.includes('academy')) {
        description = 'RAG Academy. Educational sandbox with interactive visualizations of Cosine Similarity angles, TF-IDF weights, word-embedding space, and step-by-step pipelines.';
      }

      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ name: 'twitter:description', content: description });
    });
  }
}
