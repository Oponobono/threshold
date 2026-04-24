import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { theme } from '../styles/theme';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const PAGE_WIDTH = width - theme.spacing.lg * 2;
const AUTO_SLIDE_INTERVAL = 4000; // 4 seconds

export const FeatureCarousel = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allFeatures = [
    // Page 1
    {
      id: '1',
      title: t('features.bento.title'),
      description: t('features.bento.desc'),
      icon: 'grid',
    },
    {
      id: '2',
      title: t('features.gpa.title'),
      description: t('features.gpa.desc'),
      icon: 'trending-up',
    },
    {
      id: '3',
      title: t('features.photo.title'),
      description: t('features.photo.desc'),
      icon: 'camera',
    },
    // Page 2
    {
      id: '4',
      title: t('features.schedule.title'),
      description: t('features.schedule.desc'),
      icon: 'calendar',
    },
    {
      id: '5',
      title: t('features.tasks.title'),
      description: t('features.tasks.desc'),
      icon: 'check-square',
    },
    {
      id: '6',
      title: t('features.gallery.title'),
      description: t('features.gallery.desc'),
      icon: 'image',
    },
    // Page 3
    {
      id: '7',
      title: t('features.cloud.title'),
      description: t('features.cloud.desc'),
      icon: 'cloud',
    },
    {
      id: '8',
      title: t('features.security.title'),
      description: t('features.security.desc'),
      icon: 'shield',
    },
    {
      id: '9',
      title: t('features.custom.title'),
      description: t('features.custom.desc'),
      icon: 'sliders',
    },
  ];

  // Agrupar en páginas de 3
  const pages = [];
  for (let i = 0; i < allFeatures.length; i += 3) {
    pages.push(allFeatures.slice(i, i + 3));
  }

  const startAutoSlide = () => {
    stopAutoSlide();
    timeoutRef.current = setTimeout(() => {
      let nextPage = currentPage + 1;
      if (nextPage >= pages.length) {
        nextPage = 0;
      }
      scrollViewRef.current?.scrollTo({
        x: nextPage * PAGE_WIDTH,
        animated: true,
      });
      setCurrentPage(nextPage);
    }, AUTO_SLIDE_INTERVAL);
  };

  const stopAutoSlide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    startAutoSlide();
    return stopAutoSlide;
  }, [currentPage]); // Reinicia el temporizador cada vez que cambia la página

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / PAGE_WIDTH);
    if (pageIndex !== currentPage && pageIndex >= 0 && pageIndex < pages.length) {
      setCurrentPage(pageIndex);
    }
  };

  const handleScrollBeginDrag = () => {
    stopAutoSlide(); // Detener al arrastrar
  };

  const handleScrollEndDrag = () => {
    startAutoSlide(); // Reanudar al soltar
  };

  return (
    <View style={styles.carouselContainer}>
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={PAGE_WIDTH}
        decelerationRate="fast"
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {pages.map((pageFeatures, index) => (
          <View key={`page-${index}`} style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
            {pageFeatures.map((feature) => (
              <View key={feature.id} style={styles.featureCard}>
                <View style={styles.iconContainer}>
                  <Feather name={feature.icon as any} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.featureTitle} numberOfLines={1}>{feature.title}</Text>
                  <Text style={styles.featureDesc} numberOfLines={2}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Pagination Line Outside ScrollView */}
      <View style={styles.paginationRow}>
        <View style={styles.dotsContainer}>
          {pages.map((_, index) => (
            <View 
              key={`dot-${index}`} 
              style={[
                styles.dot, 
                currentPage === index ? styles.activeDot : null,
                currentPage === index ? { width: 16 } : null // Animación sutil de ancho
              ]} 
            />
          ))}
        </View>
        <Text style={styles.swipeText}>
          {currentPage === pages.length - 1 ? t('features.swipeToStart') : t('features.swipeToExplore')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  pageContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  featureCard: {
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, // Cambio a horizontal para respetar el height
    height: 74, // Alto fijo para asegurar coherencia visual
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg, // Ajustado para alinear con el pageContainer
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9D9D9',
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
  swipeText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
});
