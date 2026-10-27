import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Colors } from '../constants/theme';

interface Props {
  uri: string;
  style?: any;
}

export default function VideoPlayer({ uri, style }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={style || styles.video}
      allowsPictureInPicture
      nativeControls
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', height: 240, borderRadius: 12, backgroundColor: Colors.dark.glass },
});