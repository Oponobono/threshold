import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import YoutubeIframe from 'react-native-youtube-iframe';
import { theme } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 200;
const MEDIUM_SIZE = (SCREEN_WIDTH - 20 * 2 - 8) / 2; // two columns with gap
const RADIUS = 24;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GridMediaItem {
  id: string;
  name: string;
  type: 'recording' | 'video';
  date: string;
  created_at?: string;
  subject_name?: string;
  subject_color?: string;
  uri?: string;
  thumbnail_url?: string;
  video_id?: string;
  duration?: number;
  missingFile?: boolean;
  isPlaying?: boolean;
}

export interface SubjectSection {
  subjectName: string;
  subjectColor?: string;
  items: GridMediaItem[];
}

interface RecordingsGridProps {
  sections: SubjectSection[];
  playingId: string | null;
  onPlay: (uri: string, id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
  onPress: (item: GridMediaItem) => void;
}

// ─── Waveform animation ───────────────────────────────────────────────────────
const BARS = [0.3, 0.6, 0.9, 0.5, 1, 0.7, 0.4, 0.8, 0.6, 0.3, 0.5, 0.9, 0.7, 0.4];

function AnimatedWaveform({ color = '#fff', height = 36 }: { color?: string; height?: number }) {
  const anims = useRef(BARS.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, {
            toValue: 0.9 + Math.random() * 0.1,
            duration: 400 + i * 30,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.2,
            duration: 400 + i * 30,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height }}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            height: height * BARS[i],
            transform: [{ scaleY: anim }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({
  item,
  subjectColor,
  isPlaying,
  onPlay,
  onStop,
  onDelete,
  onPress,
}: {
  item: GridMediaItem;
  subjectColor?: string;
  isPlaying: boolean;
  onPlay: (uri: string, id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
  onPress: (item: GridMediaItem) => void;
}) {
  const accent = subjectColor || theme.colors.primary;
  const isVideo = item.type === 'video';
  const [isInlinePlaying, setIsInlinePlaying] = useState(false);

  // If inline playing, show just the video player
  if (isVideo && isInlinePlaying && item.video_id) {
    return (
      <View
        style={{
          borderRadius: RADIUS,
          overflow: 'hidden',
          height: HERO_HEIGHT,
          marginBottom: 12,
          backgroundColor: '#000',
        }}
      >
        <YoutubeIframe
          height={HERO_HEIGHT}
          play={true}
          videoId={item.video_id}
          initialPlayerParams={{
            preventFullScreen: true,
          }}
        />
        {/* Close inline playback button overlay */}
        <TouchableOpacity
          onPress={() => setIsInlinePlaying(false)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: 'rgba(0,0,0,0.6)',
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
      style={{
        borderRadius: RADIUS,
        overflow: 'hidden',
        height: HERO_HEIGHT,
        marginBottom: 12,
        backgroundColor: accent,
      }}
    >
      {/* Background: video thumbnail or gradient overlay */}
      {isVideo && item.thumbnail_url ? (
        <Image
          source={{ uri: item.thumbnail_url }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Dark overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isVideo && item.thumbnail_url ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)',
        }}
      />

      {/* Content */}
      <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
        {/* Top row: badge + delete */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.22)',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            {isVideo ? (
              <MaterialCommunityIcons name="youtube" size={14} color="#fff" />
            ) : (
              <Ionicons name="mic" size={14} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>
              {isVideo ? 'VIDEO' : 'AUDIO'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: 20,
              padding: 6,
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom: waveform or play icon + title */}
        <View>
          {!isVideo && (
            <View style={{ marginBottom: 8 }}>
              <AnimatedWaveform color="rgba(255,255,255,0.75)" height={32} />
            </View>
          )}
          {isVideo && (
            <View style={{ alignItems: 'flex-start', marginBottom: 8 }}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (item.video_id) setIsInlinePlaying(true);
                  else onPress(item);
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="play" size={22} color={accent} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          )}

          {!isVideo && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (isPlaying) onStop();
                else if (item.uri) onPlay(item.uri, item.id);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.9)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={accent}
                style={!isPlaying ? { marginLeft: 2 } : undefined}
              />
            </TouchableOpacity>
          )}

          <Text
            style={{ color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 }}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>{item.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Medium Card ──────────────────────────────────────────────────────────────
function MediumCard({
  item,
  subjectColor,
  isPlaying,
  onPlay,
  onStop,
  onDelete,
  onPress,
}: {
  item: GridMediaItem;
  subjectColor?: string;
  isPlaying: boolean;
  onPlay: (uri: string, id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
  onPress: (item: GridMediaItem) => void;
}) {
  const accent = subjectColor || theme.colors.primary;
  const isVideo = item.type === 'video';

  return (
    <TouchableOpacity
      activeOpacity={0.87}
      onPress={() => onPress(item)}
      style={{
        width: MEDIUM_SIZE,
        height: MEDIUM_SIZE,
        borderRadius: RADIUS,
        backgroundColor: theme.colors.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {isVideo && item.thumbnail_url ? (
        <>
          <Image
            source={{ uri: item.thumbnail_url }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
          />
        </>
      ) : null}

      <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
        {/* Top: icon + delete */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: isVideo && item.thumbnail_url ? 'rgba(255,255,255,0.2)' : `${accent}18`,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isVideo ? (
              <Ionicons name="play-circle" size={22} color={isVideo && item.thumbnail_url ? '#fff' : accent} />
            ) : (
              <Ionicons name="mic" size={20} color={accent} />
            )}
          </View>

          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="trash-outline"
              size={15}
              color={isVideo && item.thumbnail_url ? 'rgba(255,255,255,0.7)' : theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom: name + date */}
        <View>
          {!isVideo && (
            <TouchableOpacity
              onPress={() => {
                if (isPlaying) onStop();
                else if (item.uri) onPlay(item.uri, item.id);
              }}
              style={{ marginBottom: 6 }}
            >
              <Ionicons
                name={isPlaying ? 'pause-circle' : 'play-circle'}
                size={28}
                color={accent}
              />
            </TouchableOpacity>
          )}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: isVideo && item.thumbnail_url ? '#fff' : theme.colors.text.primary,
              lineHeight: 17,
            }}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: isVideo && item.thumbnail_url ? 'rgba(255,255,255,0.65)' : theme.colors.text.secondary,
              marginTop: 2,
            }}
          >
            {item.date}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Small List Row ───────────────────────────────────────────────────────────
function SmallCard({
  item,
  subjectColor,
  isPlaying,
  onPlay,
  onStop,
  onDelete,
  onPress,
  isLast,
}: {
  item: GridMediaItem;
  subjectColor?: string;
  isPlaying: boolean;
  onPlay: (uri: string, id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
  onPress: (item: GridMediaItem) => void;
  isLast?: boolean;
}) {
  const accent = subjectColor || theme.colors.primary;
  const isVideo = item.type === 'video';
  const isMissing = item.missingFile;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => !isMissing && onPress(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.colors.border,
        opacity: isMissing ? 0.6 : 1,
      }}
    >
      {/* Icon pill */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${accent}15`,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        {isVideo ? (
          <Ionicons name="play-circle" size={22} color={accent} />
        ) : (
          <Ionicons name="mic" size={20} color={accent} />
        )}
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {isMissing && (
          <Text style={{ fontSize: 11, color: theme.colors.text.error, marginTop: 1 }}>
            ⚠ Archivo no encontrado
          </Text>
        )}
        <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 1 }}>
          {item.date}
        </Text>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {!isVideo && !isMissing && (
          <TouchableOpacity
            onPress={() => {
              if (isPlaying) onStop();
              else if (item.uri) onPlay(item.uri, item.id);
            }}
            style={{ padding: 6 }}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={26}
              color={accent}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDelete(item.id)} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── One subject section ──────────────────────────────────────────────────────

function SubjectSectionView({
  section,
  playingId,
  onPlay,
  onStop,
  onDelete,
  onPress,
}: {
  section: SubjectSection;
  playingId: string | null;
  onPlay: (uri: string, id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
  onPress: (item: GridMediaItem) => void;
}) {
  const now = Date.now();
  const sorted = [...section.items].sort(
    (a, b) =>
      new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
  );

  const hero = sorted[0] ?? null;
  const recent = sorted.slice(1, 3);
  const rest = sorted.slice(3);

  const accentColor = section.subjectColor || theme.colors.primary;

  return (
    <View style={{ marginBottom: 28 }}>
      {/* Subject header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: accentColor,
          }}
        />
        <Text
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: theme.colors.text.primary,
            flex: 1,
          }}
        >
          {section.subjectName}
        </Text>
        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
          {section.items.length} {section.items.length === 1 ? 'archivo' : 'archivos'}
        </Text>
      </View>

      {/* Hero */}
      {hero && (
        <HeroCard
          item={hero}
          subjectColor={accentColor}
          isPlaying={playingId === hero.id}
          onPlay={onPlay}
          onStop={onStop}
          onDelete={onDelete}
          onPress={onPress}
        />
      )}

      {/* Medium cards row */}
      {recent.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme.colors.text.secondary,
              letterSpacing: 0.5,
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            Recientes
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {recent.map((item) => (
              <MediumCard
                key={item.id}
                item={item}
                subjectColor={accentColor}
                isPlaying={playingId === item.id}
                onPlay={onPlay}
                onStop={onStop}
                onDelete={onDelete}
                onPress={onPress}
              />
            ))}
          </View>
        </>
      )}

      {/* Small list */}
      {rest.length > 0 && (
        <View>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme.colors.text.secondary,
              letterSpacing: 0.5,
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            Anteriores
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              nestedScrollEnabled={true}
              style={rest.length > 3 ? { maxHeight: 195 } : undefined}
              showsVerticalScrollIndicator={rest.length > 3}
            >
              {rest.map((item, index) => (
                <SmallCard
                  key={item.id}
                  item={item}
                  subjectColor={accentColor}
                  isPlaying={playingId === item.id}
                  onPlay={onPlay}
                  onStop={onStop}
                  onDelete={onDelete}
                  onPress={onPress}
                  isLast={index === rest.length - 1}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Grid ────────────────────────────────────────────────────────────────
export function RecordingsGrid({
  sections,
  playingId,
  onPlay,
  onStop,
  onDelete,
  onPress,
}: RecordingsGridProps) {
  if (sections.length === 0) return null;

  return (
    <View>
      {sections.map((section) => (
        <SubjectSectionView
          key={section.subjectName}
          section={section}
          playingId={playingId}
          onPlay={onPlay}
          onStop={onStop}
          onDelete={onDelete}
          onPress={onPress}
        />
      ))}
    </View>
  );
}
