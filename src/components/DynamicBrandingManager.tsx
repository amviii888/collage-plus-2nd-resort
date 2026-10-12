'use client';

import { useEffect } from 'react';
import { findProfessorByCode, getAdminCustomTeacherCodes } from '@/lib/professors-registry';

/**
 * DynamicBrandingManager listens to app branding events and updates document title,
 * favicon links, Apple touch icons, PWA manifest, and status bar color dynamically
 * for both iOS Safari / PWA and Android Chrome / Capacitor Native context.
 */
export function DynamicBrandingManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyBranding = () => {
      try {
        const activeCode = localStorage.getItem('active_connected_professor_code') || 
                           localStorage.getItem('student_app_icon_active') ||
                           localStorage.getItem('app_active_selected_icon');
        
        const customTitle = localStorage.getItem('app_custom_branding_title');

        let targetTitle = customTitle || 'ملخصاتي | Mol5saty';
        let targetIcon = '/icon.png';
        let targetThemeColor = '#09090b';

        if (activeCode) {
          const prof = findProfessorByCode(activeCode);
          if (prof) {
            targetTitle = prof.appNameAr ? `${prof.appNameAr} | ${prof.name}` : `${prof.name} | ملخصاتي`;
            if (prof.appIconPath) {
              targetIcon = prof.appIconPath;
            } else if (prof.avatarUrl) {
              targetIcon = prof.avatarUrl;
            }
            if (prof.themeColor) {
              targetThemeColor = prof.themeColor;
            }
          }
        }

        // 1. Update Document Title
        if (targetTitle && document.title !== targetTitle) {
          document.title = targetTitle;
        }

        // 2. Update Head Meta Elements for iOS & Android PWA/Web
        const updateMeta = (nameAttr: string, valueAttr: string, content: string) => {
          let meta = document.querySelector(`meta[${nameAttr}="${valueAttr}"]`);
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(nameAttr, valueAttr);
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', content);
        };

        updateMeta('name', 'application-name', targetTitle);
        updateMeta('name', 'apple-mobile-web-app-title', targetTitle);
        updateMeta('name', 'theme-color', targetThemeColor);

        // 3. Update Favicon & Apple Touch Icons
        const updateLink = (rel: string, href: string, sizes?: string, type?: string) => {
          let link = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`) as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            if (sizes) link.sizes = sizes;
            if (type) link.type = type;
            document.head.appendChild(link);
          }
          link.href = `${href}?v=${Date.now()}`;
        };

        if (targetIcon) {
          updateLink('icon', targetIcon);
          updateLink('shortcut icon', targetIcon);
          updateLink('apple-touch-icon', targetIcon, '180x180');
        }

        // 4. Dynamic Web App Manifest Link for iOS & Android Homescreen
        const manifestObj = {
          name: targetTitle,
          short_name: targetTitle.split('|')[0].trim(),
          start_url: '/',
          display: 'standalone',
          background_color: '#09090b',
          theme_color: targetThemeColor,
          icons: [
            {
              src: targetIcon,
              sizes: '512x512',
              type: targetIcon.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
              purpose: 'any maskable'
            }
          ]
        };

        const stringified = JSON.stringify(manifestObj);
        const blob = new Blob([stringified], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(blob);

        let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink) {
          manifestLink.href = manifestUrl;
        }

        // 5. Native Capacitor Bridge updates if running inside mobile native app
        try {
          const cap = (window as any).Capacitor;
          if (cap && cap.Plugins?.StatusBar?.setBackgroundColor) {
            cap.Plugins.StatusBar.setBackgroundColor({ color: targetThemeColor });
          }
        } catch (e) {}

      } catch (err) {
        console.warn('[DynamicBrandingManager] Error applying branding:', err);
      }
    };

    applyBranding();

    window.addEventListener('app_branding_changed', applyBranding);
    window.addEventListener('app_icon_changed', applyBranding);
    window.addEventListener('connected_professors_updated', applyBranding);

    return () => {
      window.removeEventListener('app_branding_changed', applyBranding);
      window.removeEventListener('app_icon_changed', applyBranding);
      window.removeEventListener('connected_professors_updated', applyBranding);
    };
  }, []);

  return null;
}
