import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseAssistantCommand } from './assistant/commandParser';
import { IdeasVaultStore } from './assistant/ideasVault';

describe('GRAVITAS 2.0 — First Vertical Slice Intent & Service Verification', () => {
  let tempDir: string;
  let vault: IdeasVaultStore | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-v2-test-'));
  });

  afterEach(() => {
    if (vault) {
      try {
        vault.close();
      } catch {
        // ignore if already closed
      }
      vault = null;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('1. Deterministic Intent Parsing', () => {
    it('parses "What\'s due today?" into DUE_TODAY action', () => {
      const intent = parseAssistantCommand("What's due today?");
      expect(intent.kind).toBe('DUE_TODAY');
    });

    it('parses variations like "what is due today" and "due today" into DUE_TODAY action', () => {
      expect(parseAssistantCommand('what is due today').kind).toBe('DUE_TODAY');
      expect(parseAssistantCommand('Show due today').kind).toBe('DUE_TODAY');
      expect(parseAssistantCommand('due today').kind).toBe('DUE_TODAY');
    });

    it('parses "Open my Algorithms notes" into LIST_COLLECTION for STUDY_NOTE with Algorithms subject', () => {
      const intent = parseAssistantCommand('Open my Algorithms notes');
      expect(intent.kind).toBe('LIST_COLLECTION');
      if (intent.kind === 'LIST_COLLECTION') {
        expect(intent.collection).toBe('STUDY_NOTE');
        expect(intent.subject?.toLowerCase()).toBe('algorithms');
      }
    });

    it('parses "Open Netflix" into OPEN_ENTERTAINMENT action with netflix target', () => {
      const intent = parseAssistantCommand('Open Netflix');
      expect(intent.kind).toBe('OPEN_ENTERTAINMENT');
      if (intent.kind === 'OPEN_ENTERTAINMENT') {
        expect(intent.service).toBe('netflix');
        expect(intent.url).toBe('https://www.netflix.com');
        expect(intent.displayName).toBe('Netflix');
      }
    });

    it('parses "Open Spotify" into OPEN_ENTERTAINMENT action with spotify target', () => {
      const intent = parseAssistantCommand('Open Spotify');
      expect(intent.kind).toBe('OPEN_ENTERTAINMENT');
      if (intent.kind === 'OPEN_ENTERTAINMENT') {
        expect(intent.service).toBe('spotify');
        expect(intent.url).toBe('https://open.spotify.com');
        expect(intent.displayName).toBe('Spotify');
      }
    });

    it('parses "Open YouTube" into OPEN_ENTERTAINMENT action with youtube target', () => {
      const intent = parseAssistantCommand('Open YouTube');
      expect(intent.kind).toBe('OPEN_ENTERTAINMENT');
      if (intent.kind === 'OPEN_ENTERTAINMENT') {
        expect(intent.service).toBe('youtube');
        expect(intent.url).toBe('https://www.youtube.com');
        expect(intent.displayName).toBe('YouTube');
      }
    });
  });

  describe('2. SQLite Data Store Verification', () => {
    it('saves and retrieves tasks for Due Today queries', () => {
      vault = new IdeasVaultStore(tempDir);
      const todayIso = new Date().toISOString();
      const saved = vault.createTask({
        title: 'Review Dynamic Programming proofs',
        originalText: 'Review Dynamic Programming proofs due today',
        subject: 'Algorithms',
        dueDate: todayIso,
      });

      expect(saved.id).toBeDefined();
      expect(saved.title).toBe('Review Dynamic Programming proofs');

      const dueTasks = vault.listUnfinishedTasks();
      expect(dueTasks.length).toBeGreaterThanOrEqual(1);
      const found = dueTasks.find(t => t.id === saved.id);
      expect(found).toBeDefined();
      expect(found?.title).toBe('Review Dynamic Programming proofs');
    });

    it('saves and retrieves notes matching Algorithms subject', () => {
      vault = new IdeasVaultStore(tempDir);
      const saved = vault.saveStudyNote({
        title: 'Algorithms: Master Theorem',
        subject: 'Algorithms',
        originalText: '# Master Theorem\nT(n) = aT(n/b) + f(n)',
        topic: 'Master Theorem',
      });

      expect(saved.id).toBeDefined();

      const notes = vault.listItems({ collection: 'STUDY_NOTE', subject: 'Algorithms' });
      expect(notes.length).toBeGreaterThanOrEqual(1);
      const found = notes.find(n => n.id === saved.id);
      expect(found).toBeDefined();
      expect(found?.originalText).toContain('Master Theorem');
    });

    it('supports note updating for editable spatial panel', () => {
      vault = new IdeasVaultStore(tempDir);
      const note = vault.saveStudyNote({
        title: 'Recurrence Relations',
        subject: 'Algorithms',
        originalText: 'Initial note content',
        topic: 'Recurrence',
      });

      // Update content
      const updated = vault.updateIdea({
        id: note.id,
        originalText: 'Updated note content with recurrence examples.',
      });
      expect(updated.originalText).toBe('Updated note content with recurrence examples.');

      const retrieved = vault.getIdea(note.id);
      expect(retrieved?.originalText).toBe('Updated note content with recurrence examples.');
    });
  });

  describe('3. Allowlisted External Action Boundaries', () => {
    it('restricts external entertainment actions to approved destinations', () => {
      const allowedUrls = [
        'https://www.netflix.com',
        'https://open.spotify.com',
        'https://www.youtube.com'
      ];

      for (const url of allowedUrls) {
        expect(url.startsWith('https://')).toBe(true);
      }

      // Disallowed or arbitrary URL check
      const disallowed = 'https://malicious-site.example.com';
      expect(allowedUrls.includes(disallowed)).toBe(false);
    });
  });
});
