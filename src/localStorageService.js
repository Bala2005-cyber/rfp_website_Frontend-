class LocalStorageService {
  constructor() {
    this.storageKey = 'rfp_data';
    this.fileStorageKey = 'rfp_files';
  }

  // Get all RFPs from local storage
  getRFPs() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  // Convert file to base64 and save
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Save RFP to local storage
  async saveRFP(rfpData) {
    try {
      const rfps = this.getRFPs();
      let fileData = null;
      let fileName = null;
      let fileSize = null;

      if (rfpData.file) {
        // Convert file to base64 for storage
        fileData = await this.fileToBase64(rfpData.file);
        fileName = rfpData.file.name;
        fileSize = rfpData.file.size;
      }

      const newRFP = {
        ...rfpData,
        _id: Date.now().toString(), // Generate unique ID
        uploadedAt: new Date().toISOString(),
        fileData: fileData, // Store base64 data
        fileName: fileName,
        fileSize: fileSize
      };
      
      // Remove the actual file object before storing
      delete newRFP.file;
      
      rfps.push(newRFP);
      localStorage.setItem(this.storageKey, JSON.stringify(rfps));
      return newRFP;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  }

  // Get file URL from base64 data
  getFileUrl(base64Data) {
    if (!base64Data) return null;
    
    // Convert base64 back to blob URL for immediate loading
    try {
      const byteCharacters = atob(base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating blob URL:', error);
      return base64Data; // Fallback to base64
    }
  }

  // Get download URL for file
  getDownloadUrl(base64Data, fileName) {
    if (!base64Data) return null;
    
    try {
      const byteCharacters = atob(base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating download URL:', error);
      return base64Data; // Fallback to base64
    }
  }

  // Update RFP in local storage
  updateRFP(rfpId, updateData) {
    try {
      const rfps = this.getRFPs();
      const index = rfps.findIndex(rfp => rfp._id === rfpId);
      
      if (index !== -1) {
        rfps[index] = { ...rfps[index], ...updateData };
        localStorage.setItem(this.storageKey, JSON.stringify(rfps));
        return rfps[index];
      }
      throw new Error('RFP not found');
    } catch (error) {
      console.error('Error updating RFP:', error);
      throw error;
    }
  }

  // Export all RFP data as JSON
  exportRFPData() {
    try {
      const rfps = this.getRFPs();
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        rfps: rfps
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting RFP data:', error);
      throw error;
    }
  }

  // Import RFP data from JSON
  importRFPData(jsonData, mergeMode = false) {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.rfps || !Array.isArray(importData.rfps)) {
        throw new Error('Invalid import data format');
      }

      let currentRfps = mergeMode ? this.getRFPs() : [];
      
      if (mergeMode) {
        // Merge mode: add new RFPs, update existing ones
        importData.rfps.forEach(importedRfp => {
          const existingIndex = currentRfps.findIndex(rfp => rfp._id === importedRfp._id);
          if (existingIndex !== -1) {
            currentRfps[existingIndex] = importedRfp;
          } else {
            currentRfps.push(importedRfp);
          }
        });
      } else {
        // Replace mode: replace all RFPs
        currentRfps = importData.rfps;
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(currentRfps));
      return currentRfps;
    } catch (error) {
      console.error('Error importing RFP data:', error);
      throw error;
    }
  }

  // Download RFP data as JSON file
  downloadRFPData(filename = 'rfp_data.json') {
    try {
      const jsonData = this.exportRFPData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading RFP data:', error);
      throw error;
    }
  }

  // Delete RFP from local storage
  deleteRFP(rfpId) {
    try {
      const rfps = this.getRFPs();
      const filteredRfps = rfps.filter(rfp => rfp._id !== rfpId);
      
      if (filteredRfps.length < rfps.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(filteredRfps));
        return true;
      }
      throw new Error('RFP not found');
    } catch (error) {
      console.error('Error deleting RFP:', error);
      throw error;
    }
  }

  // Get RFPs filtered by status
  getRFPsByStatus(status) {
    const rfps = this.getRFPs();
    const now = new Date();

    const filtered = rfps.filter(rfp => {
      const deadline = new Date(rfp.deadline);

      switch (status) {
        case 'recent':
          return true;
        case 'completed':
          return deadline < now;
        case 'open':
          return (rfp.status || '').toLowerCase() === 'open';
        case 'extended':
          return (rfp.status || '').toLowerCase() === 'extended';
        default:
          return true;
      }
    });

    // Sort by the most useful key per tab
    const byUploadedAtDesc = (a, b) => {
      const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return bTime - aTime;
    };

    const byDeadlineAsc = (a, b) => {
      const aTime = a.deadline ? new Date(a.deadline).getTime() : 0;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : 0;
      return aTime - bTime;
    };

    if (status === 'completed') {
      // Show most recently completed first (closest past deadline)
      return filtered.sort((a, b) => byDeadlineAsc(b, a));
    }

    if (status === 'recent' || status === 'extended') {
      return filtered.sort(byUploadedAtDesc);
    }

    return filtered;
  }

  // Search RFPs
  searchRFPs(searchTerm) {
    const rfps = this.getRFPs();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return rfps.filter(rfp => 
      rfp.projectName.toLowerCase().includes(lowerSearchTerm) ||
      rfp.productSummary.toLowerCase().includes(lowerSearchTerm) ||
      rfp.status.toLowerCase().includes(lowerSearchTerm)
    );
  }

  // URL parameter data sharing
  shareDataViaURL() {
    try {
      const rfps = this.getRFPs();
      const compressedData = this.compressData(rfps);
      const url = new URL(window.location);
      url.searchParams.set('data', compressedData);
      return url.toString();
    } catch (error) {
      console.error('Error creating shareable URL:', error);
      return null;
    }
  }

  loadDataFromURL() {
    try {
      const url = new URL(window.location);
      const compressedData = url.searchParams.get('data');
      
      if (compressedData) {
        const rfps = this.decompressData(compressedData);
        if (rfps && Array.isArray(rfps)) {
          localStorage.setItem(this.storageKey, JSON.stringify(rfps));
          return rfps;
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading data from URL:', error);
      return null;
    }
  }

  compressData(data) {
    try {
      // Simple compression using base64 encoding
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch (error) {
      console.error('Error compressing data:', error);
      return null;
    }
  }

  decompressData(compressedData) {
    try {
      const jsonString = atob(compressedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error decompressing data:', error);
      return null;
    }
  }

  // Session storage fallback for larger data
  saveToSessionStorage(data) {
    try {
      sessionStorage.setItem('rfp_shared_data', JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving to session storage:', error);
      return false;
    }
  }

  loadFromSessionStorage() {
    try {
      const data = sessionStorage.getItem('rfp_shared_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading from session storage:', error);
      return null;
    }
  }
}

const localStorageService = new LocalStorageService();
export default localStorageService;
