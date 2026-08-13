'use client';

import {
  createElementObject,
  createPathComponent,
  extendContext,
} from '@react-leaflet/core';
import type {
  LeafletContextInterface,
  LeafletElement,
} from '@react-leaflet/core';
import L from 'leaflet';
import type { ReactNode } from 'react';

/**
 * leaflet.markercluster is a UMD plugin that mutates the global `L`.
 * Imports are hoisted, so we assign window.L then require() in module body.
 */
function ensureLeafletMarkerCluster(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { L?: typeof L };
  w.L = L;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('leaflet.markercluster');
}

ensureLeafletMarkerCluster();

type MarkerClusterGroupProps = L.MarkerClusterGroupOptions & {
  children?: ReactNode;
};

function createMarkerCluster(
  props: MarkerClusterGroupProps,
  context: LeafletContextInterface,
): LeafletElement<L.MarkerClusterGroup> {
  if (typeof L.MarkerClusterGroup !== 'function') {
    throw new Error(
      'Leaflet.markercluster failed to load (L.MarkerClusterGroup missing)',
    );
  }
  const { children: _children, ...options } = props;
  const group = new L.MarkerClusterGroup(options);
  return createElementObject(
    group,
    extendContext(context, { layerContainer: group }),
  );
}

const MarkerClusterGroup = createPathComponent<
  L.MarkerClusterGroup,
  MarkerClusterGroupProps
>(createMarkerCluster);

export default MarkerClusterGroup;
