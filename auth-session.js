/**
 * Hubber Authentication Session Manager
 * Include this script in protected pages for session management
 */

class SessionManager {
    constructor() {
        this.sessionKey = 'hubber_session';
        this.usersKey = 'hubber_users';
        this.loginHistoryKey = 'hubber_login_history';
        this.init();
    }

    init() {
        // Check if session exists and is valid on page load
        this.validateSession();
        
        // Add logout functionality to any element with 'logout-btn' class
        this.addLogoutHandlers();
        
        // Update user info displays
        this.updateUserDisplays();
        
        // Set up periodic session validation
        this.setupPeriodicValidation();
    }

    // Validate current session
    validateSession() {
        const session = this.getCurrentSession();
        
        if (!session) {
            // No valid session, redirect to login
            if (!this.isPublicPage()) {
                this.redirectToLogin();
            }
            return false;
        }
        
        return true;
    }

    // Get current session data
    getCurrentSession() {
        try {
            const session = localStorage.getItem(this.sessionKey);
            if (!session) return null;
            
            const sessionData = JSON.parse(session);
            const sessionExpiry = new Date(sessionData.expiry);
            
            if (sessionExpiry > new Date()) {
                return sessionData;
            } else {
                this.clearSession();
                return null;
            }
        } catch (error) {
            console.error('Error reading session:', error);
            this.clearSession();
            return null;
        }
    }

    // Check if current page is public (doesn't require authentication)
    isPublicPage() {
        const publicPages = [
            'index.html',
            'login.html',
            'register.html',
            '/'
        ];
        
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        return publicPages.includes(currentPage);
    }

    // Redirect to login page
    redirectToLogin() {
        if (window.location.pathname.includes('login.html')) return;
        
        // Store the current page to redirect back after login
        sessionStorage.setItem('hubber_redirect_after_login', window.location.href);
        
        window.location.href = 'login.html';
    }

    // Clear session data
    clearSession() {
        localStorage.removeItem(this.sessionKey);
        
        // Clear any user-specific cached data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('hubber_user_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Logout function
    logout() {
        const session = this.getCurrentSession();
        
        if (session) {
            // Log the logout event
            this.logLogoutEvent(session);
        }
        
        // Clear session
        this.clearSession();
        
        // Show logout message
        this.showLogoutMessage();
        
        // Redirect to login after a brief delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }

    // Log logout event
    logLogoutEvent(session) {
        try {
            let history = JSON.parse(localStorage.getItem(this.loginHistoryKey) || '[]');
            
            // Update the latest login record with logout time
            if (history.length > 0 && history[0].sessionId === session.sessionId) {
                history[0].logoutTime = new Date().toISOString();
                localStorage.setItem(this.loginHistoryKey, JSON.stringify(history));
            }
        } catch (error) {
            console.error('Error logging logout event:', error);
        }
    }

    // Show logout message
    showLogoutMessage() {
        // Create a temporary logout notification
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div class="alert alert-info position-fixed" style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <i class="fas fa-sign-out-alt"></i> Logged out successfully
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Add logout handlers to logout buttons
    addLogoutHandlers() {
        // Handle logout buttons
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('logout-btn') || 
                event.target.closest('.logout-btn')) {
                event.preventDefault();
                
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            }
        });

        // Handle logout links
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.tagName === 'A' && target.getAttribute('href') === '#logout') {
                event.preventDefault();
                
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            }
        });
    }

    // Update user information displays
    updateUserDisplays() {
        const session = this.getCurrentSession();
        if (!session) return;

        // Update elements with class 'user-name'
        document.querySelectorAll('.user-name').forEach(element => {
            element.textContent = session.user.name;
        });

        // Update elements with class 'user-email'
        document.querySelectorAll('.user-email').forEach(element => {
            element.textContent = session.user.email;
        });

        // Update elements with class 'user-role'
        document.querySelectorAll('.user-role').forEach(element => {
            element.textContent = session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1);
        });

        // Update elements with class 'user-id'
        document.querySelectorAll('.user-id').forEach(element => {
            element.textContent = session.user.id;
        });
    }

    // Check if user has required role
    hasRole(requiredRole) {
        const session = this.getCurrentSession();
        return session && session.user.role === requiredRole;
    }

    // Check if user has any of the required roles
    hasAnyRole(requiredRoles) {
        const session = this.getCurrentSession();
        return session && requiredRoles.includes(session.user.role);
    }

    // Protect page by role
    requireRole(requiredRole, redirectUrl = 'login.html') {
        if (!this.hasRole(requiredRole)) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    // Setup periodic session validation (every 5 minutes)
    setupPeriodicValidation() {
        setInterval(() => {
            if (!this.isPublicPage()) {
                this.validateSession();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Extend session (reset expiry time)
    extendSession() {
        const session = this.getCurrentSession();
        if (session) {
            session.expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Extend by 24 hours
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            return true;
        }
        return false;
    }

    // Get user profile data
    getUserProfile() {
        const session = this.getCurrentSession();
        return session ? session.user.profile : null;
    }

    // Update user profile in session
    updateUserProfile(profileData) {
        const session = this.getCurrentSession();
        if (session) {
            session.user.profile = { ...session.user.profile, ...profileData };
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            
            // Also update in users database
            const users = JSON.parse(localStorage.getItem(this.usersKey) || '{}');
            if (users[session.user.email]) {
                users[session.user.email].profile = session.user.profile;
                localStorage.setItem(this.usersKey, JSON.stringify(users));
            }
            
            return true;
        }
        return false;
    }

    // Check session expiry time
    getSessionTimeRemaining() {
        const session = this.getCurrentSession();
        if (session) {
            const expiry = new Date(session.expiry);
            const now = new Date();
            const remaining = expiry.getTime() - now.getTime();
            
            return {
                milliseconds: remaining,
                minutes: Math.floor(remaining / (1000 * 60)),
                hours: Math.floor(remaining / (1000 * 60 * 60))
            };
        }
        return null;
    }

    // Show session warning when close to expiry
    showSessionWarning() {
        const remaining = this.getSessionTimeRemaining();
        
        if (remaining && remaining.minutes <= 30 && remaining.minutes > 0) {
            const warning = document.createElement('div');
            warning.innerHTML = `
                <div class="alert alert-warning position-fixed" style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                    <i class="fas fa-clock"></i> Your session expires in ${remaining.minutes} minutes
                    <button class="btn btn-sm btn-outline-dark ms-2" onclick="sessionManager.extendSession(); this.parentElement.remove();">
                        Extend Session
                    </button>
                </div>
            `;
            
            document.body.appendChild(warning);
            
            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, 10000);
        }
    }
}

// Initialize session manager
const sessionManager = new SessionManager();

// Expose useful functions globally
window.hubberAuth = {
    getCurrentUser: () => sessionManager.getCurrentSession()?.user,
    logout: () => sessionManager.logout(),
    hasRole: (role) => sessionManager.hasRole(role),
    extendSession: () => sessionManager.extendSession(),
    getTimeRemaining: () => sessionManager.getSessionTimeRemaining()
};

// Debug functions
window.debugSession = {
    showSession: () => console.log('Current Session:', sessionManager.getCurrentSession()),
    showTimeRemaining: () => console.log('Time Remaining:', sessionManager.getSessionTimeRemaining()),
    forceLogout: () => sessionManager.logout(),
    extendSession: () => sessionManager.extendSession()
};

console.log('🔐 Hubber Session Manager Loaded');
console.log('💡 Use hubberAuth.getCurrentUser() to get current user');
console.log('💡 Use hubberAuth.logout() to logout');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
} 