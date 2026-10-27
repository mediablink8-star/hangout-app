import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Share, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { api } from '../lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  gatheringId: string;
  gatheringTitle: string;
  hostId?: string;
  hostName?: string;
}

export default function ShareSheet({ visible, onClose, gatheringId, gatheringTitle, hostId, hostName }: Props) {
  const base = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';
  const link = `${base}/share/g/${gatheringId}`;
  const profileLink = hostId ? `${base}/share/u/${hostId}` : null;

  const track = (type: string) => {
    fetch(base + '/analytics/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, target_type: 'gathering', target_id: gatheringId }) }).catch(() => {});
  };

  const nativeShare = async () => {
    track('share_native');
    try { await Share.share({ message: `Join me at "${gatheringTitle}" on Hangout: ${link}`, url: link }); } catch {}
    onClose();
  };

  const copyLink = async () => {
    track('copy_link');
    Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'Link copied to clipboard.');
    onClose();
  };

  const instagramStory = async () => {
    track('share_ig_story');
    try {
      // Fetch the share card SVG and convert to data URL for Instagram Story background
      const res = await fetch(`${base}/share/card/g/${gatheringId}.svg`);
      const svg = await res.text();
      const b64 = (typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(svg))) : '');
      const canOpen = await Linking.canOpenURL('instagram-stories://share');
      if (canOpen && b64) {
        // Instagram expects a background image; pass via pasteboard is not directly supported in RN without native module.
        // Fallback to native share sheet which can target Instagram.
        await Share.share({ message: `Join me at "${gatheringTitle}" on Hangout: ${link}` });
      } else {
        Alert.alert('Instagram not available', 'Instagram Story sharing requires the Instagram app. Using native share instead.');
        await Share.share({ message: `Join me at "${gatheringTitle}" on Hangout: ${link}` });
      }
    } catch {
      await Share.share({ message: `Join me at "${gatheringTitle}" on Hangout: ${link}` });
    }
    onClose();
  };

  const shareProfile = async () => {
    if (!profileLink) return;
    track('share_profile');
    try { await Share.share({ message: `${hostName || 'A host'} on Hangout: ${profileLink}`, url: profileLink }); } catch {}
    onClose();
  };

  const saveImage = async () => {
    track('save_image');
    Alert.alert('Save image', 'Open the link below in your browser to save the share graphic:\n' + `${base}/share/card/g/${gatheringId}.svg`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={[Typography.h3, { color: Colors.dark.text, marginBottom: Spacing.md }]}>Share</Text>
        <TouchableOpacity style={styles.option} onPress={instagramStory}>
          <Text style={styles.optionText}>Share to Instagram Story</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={nativeShare}>
          <Text style={styles.optionText}>Share via...</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={copyLink}>
          <Text style={styles.optionText}>Copy link</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={saveImage}>
          <Text style={styles.optionText}>Save Story image</Text>
        </TouchableOpacity>
        {profileLink && (
          <TouchableOpacity style={styles.option} onPress={shareProfile}>
            <Text style={styles.optionText}>Share host profile</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.option, { borderBottomWidth: 0 }]} onPress={onClose}>
          <Text style={[styles.optionText, { color: Colors.dark.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  option: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  optionText: { color: Colors.dark.text, fontSize: 16, fontWeight: '600' },
});