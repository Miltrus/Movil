import { Injectable } from '@angular/core';
import { WayPointInterface } from '../models/waypoint.interface';

@Injectable({
  providedIn: 'root'
})
export class WaypointsService {

  private waypoints: WayPointInterface[] = [];
  private packageIdToWaypointMap: Map<string, WayPointInterface> = new Map();
  private waypointsKey = 'waypoitns'

  constructor() { }

  setWaypoints(waypoints: WayPointInterface[]) {
    localStorage.setItem(this.waypointsKey, JSON.stringify(waypoints));
  }

  getWaypoints(): WayPointInterface[] {
    const storedWaypoints = localStorage.getItem(this.waypointsKey);
    return storedWaypoints ? JSON.parse(storedWaypoints) : [];
  }

  associatePackageWithWaypoint(packageId: string, waypoint: WayPointInterface) {
    this.packageIdToWaypointMap.set(packageId, waypoint);
  }

  getPackageIdFromWaypoint(waypoint: WayPointInterface): string | null {
    for (const [packageId, associatedWaypoint] of this.packageIdToWaypointMap) {
      if (associatedWaypoint === waypoint) {
        return packageId;
      }
    }
    return null;
  }
}