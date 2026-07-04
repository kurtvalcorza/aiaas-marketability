/**
 * Utility functions for the application
 */

/**
 * Creates a debounced version of a function
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Smoothly scrolls an element into view
 * @param element - The element to scroll to
 * @param behavior - The scroll behavior ('smooth' or 'auto')
 */
export function smoothScrollToElement(
  element: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (element) {
    element.scrollIntoView({
      behavior,
      block: 'end',
      inline: 'nearest'
    });
  }
}