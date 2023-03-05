package proximity_monitor_test

import (
	"testing"
	. "github.com/henrikkorsgaard/goproxy/proximity_monitor"

)

type TestSubscriber struct {
	deviceDiscovered func(d Device)
	deviceEvicted func(d Device)
	updateDevices func(ds []Device)
}


func (t *TestSubscriber) DeviceDiscovered(device Device) {
	if(t.deviceDiscovered != nil) {
		t.deviceDiscovered(device)
	}
}


func (t *TestSubscriber) DeviceEvicted(device Device) {
	if(t.deviceEvicted != nil) {
		t.deviceEvicted(device)
	}
}
	
func (t *TestSubscriber) UpdateDevices(devices []Device) {
	if(t.updateDevices != nil) {
		t.updateDevices(devices)
	}
}

func Test_MockMonitorDeviceDiscovery(t *testing.T) {
	var mockMonitor MockProximityMonitor
	ts := &TestSubscriber{
		deviceDiscovered: func(d Device){
			if("90:44:AB:91:EA:0A" == d.MACAddr){
				mockMonitor.Stop()
			}
		},
	}

	mockMonitor = MockProximityMonitor{
		ReportIntervalSeconds:5,
		DeviceEvictedTimeoutSeconds: 5,
		Subscriber: ts,}
	mockMonitor.Start()
}

func Test_MockMonitorDeviceEvicted(t *testing.T) {
	var mockMonitor MockProximityMonitor
	ts := &TestSubscriber{
		deviceEvicted: func(d Device){
			mockMonitor.Stop()
		},
	}

	mockMonitor = MockProximityMonitor{
		ReportIntervalSeconds:5,
		DeviceEvictedTimeoutSeconds: 5,
		Subscriber: ts,}
	mockMonitor.Start()
}

func Test_MockMonitorUpdateDevices(t *testing.T) {
	var mockMonitor MockProximityMonitor
	ts := &TestSubscriber{
		updateDevices: func(ds []Device){
			if(len(ds) == 0){
				t.Fatalf("UpdateDevices returned empty list")
			}
			mockMonitor.Stop()
		},
	}

	mockMonitor = MockProximityMonitor{
		ReportIntervalSeconds:5,
		DeviceEvictedTimeoutSeconds: 5,
		Subscriber: ts,}
	mockMonitor.Start()
}