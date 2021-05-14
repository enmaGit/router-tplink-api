export default interface Device {
  name: string;
  mac: string;
  ip: string;
  lastConnection: string;
  hostId: number;
  enable: boolean;
  bytesDownloaded: number;
  speed: number;
  type: string;
}
