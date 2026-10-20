import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HarvestManifest } from '../extension/slicer_core.js';

describe('HarvestManifest: Crash-Resistant State Machine & Resumable Checkpoint Engine', () => {
  it('initializes a fresh manifest with PENDING status for all slices', () => {
    const plan = [
      { id: 'slice_1', type: 'HEADCOUNT', bracket: ['1,10'], total: 100 },
      { id: 'slice_2', type: 'HEADCOUNT', bracket: ['11,20'], total: 200 }
    ];

    const manifest = new HarvestManifest();
    manifest.create('test_job_123', { q_keywords: 'engineer' }, plan);

    assert.equal(manifest.jobId, 'test_job_123');
    assert.equal(manifest.status, 'PENDING');
    assert.equal(manifest.slices.length, 2);
    assert.equal(manifest.slices[0].status, 'PENDING');
    assert.equal(manifest.slices[1].status, 'PENDING');
  });

  it('transitions slice status through PENDING -> IN_PROGRESS -> COMPLETED with net fresh metrics', () => {
    const plan = [
      { id: 'slice_1', bracket: ['1,10'], total: 100 }
    ];
    const manifest = new HarvestManifest();
    manifest.create('job_1', {}, plan);

    manifest.updateSlice('slice_1', { status: 'IN_PROGRESS' });
    assert.equal(manifest.slices[0].status, 'IN_PROGRESS');
    assert.equal(manifest.status, 'IN_PROGRESS');

    manifest.updateSlice('slice_1', {
      status: 'COMPLETED',
      harvested: 95,
      netFresh: 90,
      duplicates: 5
    });

    assert.equal(manifest.slices[0].status, 'COMPLETED');
    assert.equal(manifest.slices[0].harvested, 95);
    assert.equal(manifest.slices[0].netFresh, 90);
    assert.equal(manifest.slices[0].duplicates, 5);
    assert.equal(manifest.isComplete(), true);
    assert.equal(manifest.status, 'COMPLETED');
  });

  it('identifies pending slices correctly for resumption after crash or page refresh', () => {
    const plan = [
      { id: 's1', bracket: ['1,5'], total: 50 },
      { id: 's2', bracket: ['6,10'], total: 60 },
      { id: 's3', bracket: ['11,15'], total: 70 }
    ];
    const manifest = new HarvestManifest();
    manifest.create('resume_job', {}, plan);

    manifest.updateSlice('s1', { status: 'COMPLETED', harvested: 50, netFresh: 50 });
    manifest.updateSlice('s2', { status: 'FAILED', error: 'NETWORK_TIMEOUT' });

    const pending = manifest.getPendingSlices();
    assert.equal(pending.length, 2); // s2 (FAILED, needs retry) and s3 (PENDING)
    assert.deepEqual(pending.map(s => s.id), ['s2', 's3']);
  });

  it('serializes and deserializes accurately preserving exact counts and states', () => {
    const plan = [
      { id: 's1', bracket: ['1,5'], total: 50 }
    ];
    const manifest = new HarvestManifest();
    manifest.create('persist_job', { city: 'Berlin' }, plan);
    manifest.updateSlice('s1', { status: 'COMPLETED', harvested: 50, netFresh: 48, duplicates: 2 });

    const serialized = manifest.serialize();
    assert.equal(typeof serialized, 'string');

    const restored = new HarvestManifest();
    restored.deserialize(serialized);

    assert.equal(restored.jobId, 'persist_job');
    assert.equal(restored.status, 'COMPLETED');
    assert.equal(restored.slices[0].netFresh, 48);
    assert.equal(restored.slices[0].duplicates, 2);
    assert.deepEqual(restored.searchParams, { city: 'Berlin' });
  });

  it('calculates aggregate progress with strict net-fresh counting discipline', () => {
    const plan = [
      { id: 's1', total: 100 },
      { id: 's2', total: 100 },
      { id: 's3', total: 100 }
    ];
    const manifest = new HarvestManifest();
    manifest.create('metrics_job', {}, plan);

    manifest.updateSlice('s1', { status: 'COMPLETED', harvested: 100, netFresh: 90, duplicates: 10 });
    manifest.updateSlice('s2', { status: 'COMPLETED', harvested: 100, netFresh: 85, duplicates: 15 });

    const progress = manifest.getProgress();
    assert.equal(progress.totalSlices, 3);
    assert.equal(progress.completedSlices, 2);
    assert.equal(progress.netFreshTotal, 175);
    assert.equal(progress.duplicatesTotal, 25);
    assert.equal(progress.percentComplete, 67); // 2 out of 3
  });
});
