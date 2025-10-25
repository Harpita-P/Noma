// RAG System for handling large context documents
// Uses OpenAI text-embedding-3-small and browser storage

class RAGSystem {
  constructor() {
    this.maxContextChars = 15000;
    this.chunkSize = 1800; // characters per chunk
    this.chunkOverlap = 200; // overlap between chunks
    this.embeddingModel = 'text-embedding-3-small';
    this.dbName = 'NomaRAGStore';
    this.dbVersion = 1;
    this.db = null;
    this.openaiApiKey = null;
  }

  // Initialize the RAG system
  async initialize() {
    await this.initializeDatabase();
    await this.loadOpenAIKey();
    console.log('Noma RAG: System initialized');
  }

  // Load OpenAI API key from extension storage
  async loadOpenAIKey() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('noma-openai-key');
        this.openaiApiKey = result['noma-openai-key'] || null;
        if (this.openaiApiKey) {
          console.log('Noma RAG: OpenAI API key loaded from storage');
        } else {
          console.warn('Noma RAG: No OpenAI API key found in storage');
        }
      }
    } catch (error) {
      console.error('Noma RAG: Failed to load OpenAI API key:', error);
    }
  }

  // Set OpenAI API key and save to storage
  async setOpenAIKey(apiKey) {
    this.openaiApiKey = apiKey;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ 'noma-openai-key': apiKey });
        console.log('Noma RAG: OpenAI API key saved to storage');
      }
    } catch (error) {
      console.error('Noma RAG: Failed to save OpenAI API key:', error);
    }
  }

  // Check if OpenAI API key is available
  hasApiKey() {
    return !!this.openaiApiKey;
  }

  // Set up IndexedDB for vector storage
  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('Noma RAG: Failed to open database:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('Noma RAG: Database initialized successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for document chunks
        if (!db.objectStoreNames.contains('chunks')) {
          const chunksStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunksStore.createIndex('tagId', 'tagId', { unique: false });
          chunksStore.createIndex('contextId', 'contextId', { unique: false });
        }
        
        // Store for embeddings
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingsStore = db.createObjectStore('embeddings', { keyPath: 'chunkId' });
        }
        
        // Store for metadata
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'id' });
        }
        
        console.log('Noma RAG: Database schema created');
      };
    });
  }

  // Load OpenAI API key from storage
  async loadOpenAIKey() {
    try {
      // Check if we're in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['noma-openai-key']);
        this.openaiApiKey = result['noma-openai-key'];
        if (this.openaiApiKey) {
          console.log('Noma RAG: OpenAI API key loaded successfully');
        } else {
          console.warn('Noma RAG: OpenAI API key not found. Please set it in extension options.');
        }
      } else {
        // Fallback for testing outside extension context
        console.warn('Noma RAG: Running outside Chrome extension context. Using localStorage fallback.');
        this.openaiApiKey = localStorage.getItem('noma-openai-api-key');
        if (!this.openaiApiKey) {
          console.warn('Noma RAG: OpenAI API key not found in localStorage. You can set it for testing.');
        }
      }
    } catch (error) {
      console.error('Noma RAG: Failed to load OpenAI API key:', error);
    }
  }

  // Check if text exceeds character limit
  isLargeContext(text) {
    const charCount = text.length;
    console.log(`Noma RAG: Text length: ${charCount} characters`);
    
    if (charCount > this.maxContextChars) {
      console.log(`Noma RAG: Large context detected (${charCount} > ${this.maxContextChars})`);
      return true;
    }
    
    return false;
  }

  // Analyze context data and determine if RAG is needed
  async analyzeContextData(contextData) {
    const { textBlob, images } = contextData;
    const isLarge = this.isLargeContext(textBlob);
    
    const analysis = {
      isLargeContext: isLarge,
      totalChars: textBlob.length,
      exceedsLimit: textBlob.length > this.maxContextChars,
      hasImages: images && images.length > 0,
      recommendRAG: isLarge,
      chunks: isLarge ? Math.ceil(textBlob.length / this.chunkSize) : 0
    };
    
    console.log('Noma RAG: Context analysis:', analysis);
    return analysis;
  }


  // Split text into overlapping chunks
  async chunkText(text, contextId) {
    console.log(`Noma RAG: Starting chunking for ${text.length} characters`);
    
    const chunks = [];
    let startIndex = 0;
    let chunkIndex = 0;
    const maxChunks = 100; // Safety limit to prevent infinite loops
    
    while (startIndex < text.length && chunkIndex < maxChunks) {
      console.log(`Noma RAG: Processing chunk ${chunkIndex}, startIndex: ${startIndex}`);
      
      const endIndex = Math.min(startIndex + this.chunkSize, text.length);
      let chunkText = text.slice(startIndex, endIndex);
      
      // Try to break at sentence boundaries for better semantic coherence
      if (endIndex < text.length && chunkText.length > this.chunkSize * 0.7) {
        const lastSentenceEnd = Math.max(
          chunkText.lastIndexOf('.'),
          chunkText.lastIndexOf('!'),
          chunkText.lastIndexOf('?')
        );
        
        if (lastSentenceEnd > chunkText.length * 0.7) {
          chunkText = chunkText.slice(0, lastSentenceEnd + 1);
        }
      }
      
      // Ensure we're making progress
      if (chunkText.length === 0) {
        console.warn(`Noma RAG: Empty chunk at index ${chunkIndex}, breaking`);
        break;
      }
      
      const chunk = {
        id: `${contextId}_chunk_${chunkIndex}`,
        contextId: contextId,
        text: chunkText.trim(),
        startIndex: startIndex,
        endIndex: startIndex + chunkText.length,
        chunkIndex: chunkIndex,
        timestamp: Date.now()
      };
      
      chunks.push(chunk);
      
      // Calculate next start position with overlap
      const actualChunkLength = chunkText.length;
      const nextStart = startIndex + actualChunkLength - this.chunkOverlap;
      
      // Ensure we're making progress (prevent infinite loops)
      if (nextStart <= startIndex) {
        console.warn(`Noma RAG: No progress made, advancing by minimum amount`);
        startIndex = startIndex + Math.max(100, Math.floor(this.chunkSize / 4));
      } else {
        startIndex = nextStart;
      }
      
      // Additional safety check: if we're very close to the end, break
      if (startIndex >= text.length - 50) {
        console.log(`Noma RAG: Near end of text, stopping chunking`);
        break;
      }
      
      chunkIndex++;
      
      // Yield control to prevent UI freezing
      if (chunkIndex % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    if (chunkIndex >= maxChunks) {
      console.warn(`Noma RAG: Reached maximum chunk limit (${maxChunks})`);
    }
    
    console.log(`Noma RAG: Created ${chunks.length} chunks for context ${contextId}`);
    return chunks;
  }

  // Check if API key is available
  hasApiKey() {
    return !!this.openaiApiKey;
  }

  // Generate single embedding for full text (main approach)
  async generateFullTextEmbedding(text) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please set it in the Noma extension popup.');
    }

    console.log(`Noma RAG: Generating single embedding for ${text.length} characters`);

    try {
      const requestBody = {
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float'
      };

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Noma RAG: Successfully generated full text embedding');
      
      return data.data[0].embedding;
    } catch (error) {
      console.error('Noma RAG: Failed to generate full text embedding:', error);
      throw error;
    }
  }

  // Generate embedding for a query
  async generateQueryEmbedding(query) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Noma RAG: Generating query embedding for: "${query}"`);

    try {
      const requestBody = {
        model: this.embeddingModel,
        input: query,
        encoding_format: 'float'
      };

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Noma RAG: Successfully generated query embedding');
      
      return data.data[0].embedding;
    } catch (error) {
      console.error('Noma RAG: Failed to generate query embedding:', error);
      throw error;
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Search for relevant chunks based on query
  async searchChunks(query, tagId = null, topK = 5) {
    console.log(`Noma RAG: Searching for "${query}" (topK: ${topK})`);

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Retrieve all chunks and embeddings from database
      const chunks = await this.getAllChunks(tagId);
      const embeddings = await this.getAllEmbeddings(tagId);

      console.log(`Noma RAG: Found ${chunks.length} chunks and ${embeddings.length} embeddings`);

      if (chunks.length === 0) {
        return [];
      }

      // Calculate similarities
      const similarities = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings.find(e => e.chunkId === chunk.id);
        
        if (embedding && embedding.vector) {
          const similarity = this.cosineSimilarity(queryEmbedding, embedding.vector);
          similarities.push({
            chunk: chunk,
            similarity: similarity,
            score: Math.round(similarity * 100) / 100
          });
        }
      }

      // Sort by similarity (highest first) and take top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topResults = similarities.slice(0, topK);

      console.log(`Noma RAG: Top ${topResults.length} results:`, 
        topResults.map(r => ({ score: r.score, preview: r.chunk.text.substring(0, 100) + '...' }))
      );

      return topResults;

    } catch (error) {
      console.error('Noma RAG: Search failed:', error);
      throw error;
    }
  }

  // Get all chunks from database (optionally filtered by tagId)
  async getAllChunks(tagId = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const chunks = [];

      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const chunk = cursor.value;
          if (!tagId || chunk.tagId === tagId) {
            chunks.push(chunk);
          }
          cursor.continue();
        } else {
          resolve(chunks);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get all embeddings from database (optionally filtered by tagId)
  async getAllEmbeddings(tagId = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      const embeddings = [];

      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const embedding = cursor.value;
          if (!tagId || embedding.tagId === tagId) {
            embeddings.push(embedding);
          }
          cursor.continue();
        } else {
          resolve(embeddings);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Store chunks and embeddings in IndexedDB
  async storeChunksWithEmbeddings(chunks, embeddings, tagId) {
    const transaction = this.db.transaction(['chunks', 'embeddings'], 'readwrite');
    const chunksStore = transaction.objectStore('chunks');
    const embeddingsStore = transaction.objectStore('embeddings');
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = { ...chunks[i], tagId };
        const embedding = { 
          chunkId: chunk.id, 
          tagId: tagId,
          vector: embeddings[i] 
        };
        
        await chunksStore.put(chunk);
        await embeddingsStore.put(embedding);
      }
      
      console.log(`Noma RAG: Stored ${chunks.length} chunks with embeddings for tag ${tagId}`);
    } catch (error) {
      console.error('Noma RAG: Failed to store chunks:', error);
      throw error;
    }
  }

  // Search for relevant chunks using semantic similarity
  async searchChunks(query, tagId, topK = 3) {
    try {
      console.log(`Noma RAG: Searching for chunks related to: "${query}"`);
      
      // Generate embedding for the query
      const queryEmbedding = await this.generateFullTextEmbedding(query);
      
      // Get all chunks and embeddings for this tag
      const chunks = await this.getAllChunks(tagId);
      const embeddings = await this.getAllEmbeddings(tagId);
      
      if (chunks.length === 0) {
        console.log('Noma RAG: No chunks found for tag');
        return [];
      }
      
      // Calculate similarity scores
      const results = [];
      for (const chunk of chunks) {
        const embedding = embeddings.find(e => e.chunkId === chunk.id);
        if (embedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, embedding.vector);
          results.push({
            chunk: chunk,
            score: similarity
          });
        }
      }
      
      // Sort by similarity and return top K
      results.sort((a, b) => b.score - a.score);
      const topResults = results.slice(0, topK);
      
      console.log(`Noma RAG: Found ${topResults.length} relevant chunks`);
      return topResults;
      
    } catch (error) {
      console.error('Noma RAG: Error searching chunks:', error);
      return [];
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }


  // Check if embeddings already exist for a context
  async hasEmbeddings(contextId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const index = store.index('contextId');
      const request = index.count(contextId);
      
      request.onsuccess = () => {
        const count = request.result;
        console.log(`Noma RAG: Found ${count} existing chunks for context ${contextId}`);
        resolve(count > 0);
      };
      
      request.onerror = () => {
        console.error('Noma RAG: Error checking embeddings:', request.error);
        reject(request.error);
      };
    });
  }

  // Process large context and create embeddings
  async processLargeContext(textBlob, contextId, tagId) {
    try {
      console.log(`Noma RAG: Processing large context ${contextId} for tag ${tagId}`);
      
      // Check if already processed
      if (await this.hasEmbeddings(contextId)) {
        console.log('Noma RAG: Embeddings already exist, skipping processing');
        return;
      }
      
      // Create chunks
      const chunks = await this.chunkText(textBlob, contextId);
      
      // Generate embeddings for each chunk
      console.log(`Noma RAG: Generating embeddings for ${chunks.length} chunks`);
      const embeddings = [];
      
      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await this.generateFullTextEmbedding(chunks[i].text);
          embeddings.push(embedding);
          console.log(`Noma RAG: Generated embedding ${i + 1}/${chunks.length}`);
          
          // Small delay to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Noma RAG: Failed to generate embedding for chunk ${i}:`, error);
          throw error;
        }
      }
      
      // Store in database
      await this.storeChunksWithEmbeddings(chunks, embeddings, tagId);
      
      console.log(`Noma RAG: Successfully processed large context ${contextId}`);
    } catch (error) {
      console.error('Noma RAG: Failed to process large context:', error);
      throw error;
    }
  }
}

// Export for use in other files
window.RAGSystem = RAGSystem;
