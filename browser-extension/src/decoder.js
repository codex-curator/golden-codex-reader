/**
 * Golden Codex Decoder - Browser Extension Core
 * Decodes GCUIS payloads: Base64 → GZIP → JSON
 *
 * Copyright (c) 2025 Metavolve Labs, Inc.
 * MIT License
 */

const GoldenCodexDecoder = {
  /**
   * Decode Base64 string to Uint8Array
   */
  base64Decode(base64) {
    const binaryString = atob(base64.trim());
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },

  /**
   * Decompress GZIP data using DecompressionStream (modern browsers)
   */
  async gzipDecompress(compressedData) {
    // Try native DecompressionStream first (Chrome 80+, Firefox 113+)
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(compressedData);
      writer.close();

      const reader = stream.readable.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return new TextDecoder().decode(result);
    }

    // Fallback: Use pako if available
    if (typeof pako !== 'undefined') {
      return pako.ungzip(compressedData, { to: 'string' });
    }

    throw new Error('No decompression method available. Please use a modern browser.');
  },

  /**
   * Calculate SHA-256 hash (Soulmark verification)
   */
  async calculateSoulmark(data) {
    const jsonString = typeof data === 'object' ? JSON.stringify(data) : data;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Full decode pipeline: Base64 → GZIP → JSON
   */
  async decodePayload(base64Payload) {
    try {
      // Step 1: Base64 decode
      const compressedData = this.base64Decode(base64Payload);

      // Step 2: GZIP decompress
      const jsonString = await this.gzipDecompress(compressedData);

      // Step 3: JSON parse
      const goldenCodex = JSON.parse(jsonString);

      return {
        success: true,
        data: goldenCodex,
        rawJson: jsonString
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Verify integrity against expected Soulmark
   */
  async verifyIntegrity(payload, expectedSoulmark) {
    const result = await this.decodePayload(payload);
    if (!result.success) {
      return { valid: false, error: result.error };
    }

    const calculatedSoulmark = await this.calculateSoulmark(result.data);

    return {
      valid: calculatedSoulmark === expectedSoulmark,
      data: result.data,
      calculatedSoulmark,
      expectedSoulmark
    };
  },

  /**
   * Extract summary for display
   */
  getSummary(goldenCodex) {
    return {
      schemaVersion: goldenCodex.schemaVersion || 'N/A',
      artifactId: goldenCodex._identifiers?.artifactId || goldenCodex.artifactId || 'N/A',
      title: goldenCodex.title || 'Untitled',
      description: goldenCodex.description || '',
      copyrightHolder: goldenCodex.ownership_and_rights?.copyright?.holder || 'Unknown',
      copyrightYear: goldenCodex.ownership_and_rights?.copyright?.year || '',
      soulWhisperEnabled: goldenCodex.soulWhisper?.enabled || false,
      soulWhisperMessage: goldenCodex.soulWhisper?.message || null,
      soulWhisperSender: goldenCodex.soulWhisper?.sender || null,
      primaryEmotion: goldenCodex.emotional_and_thematic_journey?.primary_emotion || 'N/A',
      mood: goldenCodex.emotional_and_thematic_journey?.mood || '',
      keywords: goldenCodex.contextual_graph?.keywords || [],
      themes: goldenCodex.artistic_statement?.themes || [],
      institution: goldenCodex.archival?.institution || '',
      colorPalette: goldenCodex.visual_analysis?.color_palette || [],
      composition: goldenCodex.visual_analysis?.composition || '',
      style: goldenCodex.visual_analysis?.style_and_technique || ''
    };
  },

  /**
   * Format metadata for display
   */
  formatForDisplay(goldenCodex) {
    const summary = this.getSummary(goldenCodex);

    let html = `
      <div class="gc-metadata">
        <div class="gc-header">
          <h2>${this.escapeHtml(summary.title)}</h2>
          <span class="gc-id">${this.escapeHtml(summary.artifactId)}</span>
        </div>
    `;

    // SoulWhisper (if enabled)
    if (summary.soulWhisperEnabled && summary.soulWhisperMessage) {
      html += `
        <div class="gc-soulwhisper">
          <div class="gc-soulwhisper-icon">💫</div>
          <div class="gc-soulwhisper-content">
            <div class="gc-soulwhisper-label">SoulWhisper</div>
            <div class="gc-soulwhisper-message">"${this.escapeHtml(summary.soulWhisperMessage)}"</div>
            ${summary.soulWhisperSender ? `<div class="gc-soulwhisper-sender">— ${this.escapeHtml(summary.soulWhisperSender)}</div>` : ''}
          </div>
        </div>
      `;
    }

    // Description
    if (summary.description) {
      html += `
        <div class="gc-section">
          <div class="gc-section-title">Description</div>
          <div class="gc-section-content">${this.escapeHtml(summary.description)}</div>
        </div>
      `;
    }

    // Emotional Journey
    if (summary.primaryEmotion !== 'N/A') {
      html += `
        <div class="gc-section">
          <div class="gc-section-title">Emotional Journey</div>
          <div class="gc-emotion">${this.escapeHtml(summary.primaryEmotion)}</div>
          ${summary.mood ? `<div class="gc-mood">${this.escapeHtml(summary.mood)}</div>` : ''}
        </div>
      `;
    }

    // Color Palette
    if (summary.colorPalette.length > 0) {
      html += `
        <div class="gc-section">
          <div class="gc-section-title">Color Palette</div>
          <div class="gc-colors">
            ${summary.colorPalette.map(c => `
              <div class="gc-color" title="${this.escapeHtml(c.color_name || '')}">
                <div class="gc-color-swatch" style="background-color: ${c.hex || '#ccc'}"></div>
                <div class="gc-color-name">${this.escapeHtml(c.color_name || 'Unknown')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Keywords/Themes
    const tags = [...summary.keywords, ...summary.themes].filter(Boolean);
    if (tags.length > 0) {
      html += `
        <div class="gc-section">
          <div class="gc-section-title">Keywords</div>
          <div class="gc-tags">
            ${tags.slice(0, 10).map(tag => `<span class="gc-tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Copyright
    html += `
      <div class="gc-section gc-copyright">
        <div class="gc-section-title">Rights</div>
        <div class="gc-section-content">
          © ${this.escapeHtml(summary.copyrightYear)} ${this.escapeHtml(summary.copyrightHolder)}
        </div>
        ${summary.institution ? `<div class="gc-institution">${this.escapeHtml(summary.institution)}</div>` : ''}
      </div>
    `;

    // Schema version
    html += `
      <div class="gc-footer">
        <span class="gc-schema">Golden Codex v${this.escapeHtml(summary.schemaVersion)}</span>
        <a href="https://goldencodex.art" target="_blank" class="gc-link">Learn More</a>
      </div>
    </div>
    `;

    return html;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// Export for different contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoldenCodexDecoder;
}
if (typeof window !== 'undefined') {
  window.GoldenCodexDecoder = GoldenCodexDecoder;
}
