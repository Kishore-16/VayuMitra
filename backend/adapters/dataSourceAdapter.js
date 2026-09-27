// Data Source Adapter Factory
import { config } from '../config.js';
import { MockDataAdapter } from './mockAdapter.js';
import { LiveDataAdapter } from './liveAdapter.js';

const mockAdapter = new MockDataAdapter();
const liveAdapter = new LiveDataAdapter();

export function getAdapter(dataType) {
  const provider = config.dataSources[dataType]?.provider || "mock";
  if (provider === "mock") {
    return mockAdapter;
  }
  return liveAdapter;
}
