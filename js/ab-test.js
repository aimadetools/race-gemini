const ABTest = {
  async init(experimentName) {
    try {
      const response = await fetch(`/api/assign?experiment=${experimentName}`);
      const data = await response.json();
      this.variant = data.variant;
      
      // Apply variant class to body for easy CSS targeting
      document.body.classList.add(`ab-${experimentName}-${this.variant}`);
      
      return this.variant;
    } catch (err) {
      console.error('A/B Test failed to initialize:', err);
      return 'A'; // Default to control
    }
  },

  getVariant() {
    return this.variant || 'A';
  },

  track(goalName) {
    console.log(`[AB-Test] Tracking goal: ${goalName} for variant: ${this.variant}`);
    fetch('/api/track', { 
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goal: goalName, variant: this.variant }) 
    }).catch(err => console.error('Failed to track A/B test goal:', err));
  }
};

window.ABTest = ABTest;