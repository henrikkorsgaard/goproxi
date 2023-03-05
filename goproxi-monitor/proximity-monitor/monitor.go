package proximity_monitor

import (
	"time"
	"math/rand"
)

type ProximitySubscriber interface {
	DeviceDiscovered(device Device)
	DeviceEvicted(device Device)
	UpdateDevices(devices []Device)
}

type Monitor interface {
	Start() error
	Stop()
}

type Device struct {
	MACAddr string
	Signal int 
}

//https://www.devdungeon.com/content/packet-capture-injection-and-analysis-gopacket

type ProximityMonitor struct {
	NetworkInterfaceName string
	Subscriber ProximitySubscriber
	StationMAC string //?
}

func (pm *ProximityMonitor) Start() error {

	// we do the channel internally and then capture it there


	// We need to end on the monitor open

	return nil
}

func (pm *ProximityMonitor) Stop() error {
	return nil
}

type MockProximityMonitor struct {
	ReportIntervalSeconds, DeviceEvictedTimeoutSeconds int
	Subscriber ProximitySubscriber
	run bool
}

func (mpm *MockProximityMonitor) Start() error {
	
	// create new device cache
	macs := [10]string{"90:44:AB:91:EA:0A","27:3B:04:14:40:9F", "3A:22:72:70:68:D6","A5:60:F8:AD:CD:67", "99:D9:6B:04:91:33", "1D:FE:72:7C:D6:0E", "8A:91:90:7B:78:4F", "76:93:0A:5A:0F:46", "2C:93:DB:CD:04:44","69:95:E8:1F:4D:90"}

	deviceCache := make(map[string]Device)
	counter := 0
	mpm.run = true
	for range time.Tick(time.Second/10) {
		if(!mpm.run){
			break
		}
		
		rand.Seed(time.Now().UnixNano())
		
		if(len(deviceCache) == 0){
			mac := macs[0]
			signal := (rand.Intn(60)+10+1)*-1
			d := Device{mac, signal}
			deviceCache[mac] = d
			mpm.Subscriber.DeviceDiscovered(d)
			continue
		}
		
		mac := macs[rand.Intn(10)]
		if _, ok := deviceCache[mac]; !ok {
			signal := (rand.Intn(60)+10+1)*-1
			d := Device{mac, signal}
			deviceCache[mac] = d
			mpm.Subscriber.DeviceDiscovered(d)
			continue
		}
			
		
		mac = macs[rand.Intn(10)]
		if _, ok := deviceCache[mac]; ok {
			mpm.Subscriber.DeviceEvicted(deviceCache[mac])
			delete(deviceCache, mac)
		}

		counter++

		if(counter % mpm.ReportIntervalSeconds == 0){
			devices := []Device{}
			for _, d := range deviceCache {
				devices = append(devices, d)
			}
			mpm.Subscriber.UpdateDevices(devices)
		}
    }

	return nil
}

func (mpm *MockProximityMonitor) Stop() error {
	mpm.run = false
	return nil
}


