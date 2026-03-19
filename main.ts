/*
File:      github.com/ETmbit/linefollow.ts
Copyright: ETmbit, 2026

License:
This file is part of the ETmbit extensions for MakeCode for micro:bit.
It is free software and you may distribute it under the terms of the
GNU General Public License (version 3 or later) as published by the
Free Software Foundation. The full license text you find at
https://www.gnu.org/licenses.

Disclaimer:
ETmbit extensions are distributed without any warranty.

Dependencies:
ETmbit/general
*/

////////////////
//  INCLUDE   //
//  track.ts  //
////////////////

enum TrackType {
    //% block="dark on light"
    //% block.loc.nl="donker op licht"
    DarkOnLight,
    //% block="light on dark"
    //% block.loc.nl="licht op donker"
    LightOnDark,
}

enum TrackMask {
    //% block="two sensors"
    //% block.loc.nl="twee sensoren"
    Track2 = 10, // x o x o x
    //% block="three sensors"
    //% block.loc.nl="drie sensoren"
    Track3 = 14, // x o o o x
    //% block="four sensors"
    //% block.loc.nl="vier sensoren"
    Track4 = 27, // o o x o o
    //% block="five sensors"
    //% block.loc.nl="vijf sensoren"
    Track5 = 31, // o o o o o
}

enum Track {
    //% block="off the track"
    //% block.loc.nl="van de lijn af"
    OffTrack = 0,
    //% block="almost at right off the track"
    //% block.loc.nl="bijna rechts van de lijn"
    FarLeft = 1,
    //% block="right on the track"
    //% block.loc.nl="rechts op de lijn"
    Left = 2,
    //% block="midst of the track"
    //% block.loc.nl="midden op de lijn"
    Mid = 4,
    //% block="left on the track"
    //% block.loc.nl="links op de lijn"
    Right = 8,
    //% block="almost at left off the track"
    //% block.loc.nl="bijna links van de lijn"
    FarRight = 16,
}

function trackPosition(track: number, mask = TrackMask.Track2, tracktype = TrackType.DarkOnLight): Track {

    if (tracktype == TrackType.LightOnDark) track = ~track

    if (track & 1) {
        if (track & 16) return Track.Mid
        if (track & 2) return Track.Left
        return Track.FarLeft
    }
    if (track & 16) {
        if (track & 8) return Track.Right
        return Track.FarRight
    }
    if (track & 2) {
        if (track & 8) return Track.Mid
        return Track.Left
    }
    if (track & 8) return Track.Right

    return Track.OffTrack
}

///////////////////
//  END INCLUDE  //
///////////////////

////////////////
//  INCLUDE   //
//  servo.ts  //
////////////////

enum ServoType {
    Continuous = 0,
    ST90 = 90,
    ST180 = 180,
    ST270 = 270,
    ST360 = 360,
}

namespace Servo {

    export class Device {

        pin: AnalogPin
        servo: ServoType
        minpw: number = 1000
        maxpw: number = 2000

        constructor(_pin: AnalogPin, _type: ServoType) {
            this.pin = _pin
            this.servo = _type
        }

        setPulse(_min: number, _max: number) {
            this.minpw = _min;
            this.maxpw = _max;
        }

        angle(_angle: number) {
            _angle = Math.map(_angle, this.minpw, this.maxpw, 0, this.servo)
            pins.servoSetPulse(this.pin, _angle)
            //pins.servoWritePin(this.pin, _angle)
        }

        speed(_speed: number) {
            _speed = Math.map(_speed, this.minpw, this.maxpw, -100, 100)
            pins.servoSetPulse(this.pin, _speed)
        }
    }

    export function create(_pin: AnalogPin, _type: ServoType): Device {
        let device = new Device(_pin, _type)
        return device
    }
}

///////////////////
//  END INCLUDE  //
///////////////////

/////////////////////
//  INCLUDE        //
//  cutebotpro.ts  //
/////////////////////

enum Led {
    //% block="left led"
    //% block.loc.nl="linker led"
    Left,
    //% block="right led"
    //% block.loc.nl="rechter led"
    Right,
    //% block="both leds"
    //% block.loc.nl="beide leds"
    Both
}

enum ServoPort {
    S1,
    S2,
    S3,
    S4,
}

enum GpioPort {
    G1,
    G2,
    G3,
    G4,
}

namespace CutebotPro {
    // supports CutebotPro V2

    const cutebotProAddr = 0x10

    let trackType = TrackType.DarkOnLight

    let AnalogGP = [AnalogPin.P1, AnalogPin.P2, AnalogPin.P13, AnalogPin.P14]
    let DigitalGP = [DigitalPin.P1, DigitalPin.P2, DigitalPin.P13, DigitalPin.P14]

    function delay_ms(ms: number) {
        let endTime = input.runningTime() + ms;
        while (endTime > input.runningTime()) { }
    }

    export function i2cCommandSend(command: number, params: number[]) {
        let buff = pins.createBuffer(params.length + 4);
        buff[0] = 0xFF;
        buff[1] = 0xF9;
        buff[2] = command;
        buff[3] = params.length;
        for (let i = 0; i < params.length; i++) {
            buff[i + 4] = params[i];
        }
        pins.i2cWriteBuffer(cutebotProAddr, buff);
        delay_ms(1);
    }

    // MOTION MODULE

    export function twoWheelSpeed(left: number, right: number): void {
        // speed in % [-100, 100]

        let direction: number = 0;
        if (left < 0) direction |= 0x01;
        if (right < 0) direction |= 0x02;
        i2cCommandSend(0x10, [2, Math.abs(left), Math.abs(right), direction]);
    }

    export function twoWheelStop() {
        twoWheelSpeed(0, 0)
    }

    /*
        // VERSION 2.1 => NOT SUPPORTED
    
        export function pid_delay_ms(ms: number) {
            let time = control.millis() + ms
            while (1) {
                i2cCommandSend(0xA0, [0x05])
                if (pins.i2cReadNumber(cutebotProAddr, NumberFormat.UInt8LE, false) || control.millis() >= time) {
                    basic.pause(500)
                    break
                }
                basic.pause(10)
            }
        }
    
        export function twoWheelMove(speed: number, distance: number): void {
            // speed in % [-100, -40] backward and [40, 100] forward
            // distance in cm [0, 6000]
    
            distance = ((distance > 6000 ? 6000 : distance) < 0 ? 0 : distance);
            distance *= 10 // cm to mm
            let distance_h = distance >> 8;
            let distance_l = distance & 0xFF;
    
            let direction2: number
            if (speed <= 0) {
                speed = -speed
                direction2 = 3
            } else
                direction2 = 0
    
            speed *= 5 // % to mm/s
            speed = ((speed > 500 ? 500 : speed) < 200 ? 200 : speed);
            let speed_h = speed >> 8;
            let speed_l = speed & 0xFF;
    
            i2cCommandSend(0x84, [distance_h, distance_l, speed_h, speed_l, direction2]);
            pid_delay_ms(Math.round(distance * 1.0 / 1000 * 8000 + 3000))
        }
    */

    // MOTOR MODULE

    export function motor(speed: number): void {
        let direction: number = (speed > 0 ? 1 : 0)
        i2cCommandSend(0x30, [Math.abs(speed), direction])
    }

    // SERVO MODULE

    let Servos = [180, 180, 180, 180] // all ServoType.ST180

    export function setServoType(port: ServoPort, _type: ServoType) {
        Servos[port] = _type
    }

    export function servoAngle(port: ServoPort, angle: number) {
        angle = Math.map(angle, 0, Servos[port], 0, 180)
        i2cCommandSend(0x40, [port, angle])
    }

    export function servoSpeed(port: ServoPort, speed: number) {
        if (Servos[port] != ServoType.ST180) return
        speed = Math.map(speed, -100, 100, 0, 180)
        i2cCommandSend(0x40, [port, speed])
    }

    // LED MODULE

    export function ledColor(led: Led, color: Color) {
        let rgbval = fromColor(color)
        let red = (rgbval >> 16) & 0xFF;
        let green = (rgbval >> 8) & 0xFF;
        let blue = (rgbval) & 0xFF;
        i2cCommandSend(0x20, [led, red, green, blue]);
    }

    export function ledRainbow(led: Led, pace: Pace) {
        let delay: number
        switch( pace) {
            case Pace.Fast: delay = 0.25; break
            case Pace.Normal: delay = 0.5; break
            case Pace.Slow: delay = 0.75; break
        }
        ledColor(led, Color.Red)
        General.wait(delay)
        ledColor(led, Color.Orange)
        General.wait(delay)
        ledColor(led, Color.Yellow)
        General.wait(delay)
        ledColor(led, Color.Green)
        General.wait(delay)
        ledColor(led, Color.Cyan)
        General.wait(delay)
        ledColor(led, Color.Blue)
        General.wait(delay)
        ledColor(led, Color.Magenta)
        General.wait(delay)
        ledColor(led, Color.Purple)
        General.wait(delay)
    }

    export function ledFlash(led: Led, color: Color, pace: Pace, times: number) {
        let delay: number
        switch (pace) {
            case Pace.Fast: delay = 0.25; break
            case Pace.Normal: delay = 0.5; break
            case Pace.Slow: delay = 0.75; break
        }
        for (let i = 0; i < times; i++) {
            ledColor(led, color)
            General.wait(delay * 0.67)
            ledColor(led, Color.Black)
            General.wait(delay * 0.33)
        }
    }
    // TRACKING MODULE

    export function setTrackType(_type: TrackType) {
        trackType = _type
    }

    export function readTrack(): Track {
        i2cCommandSend(0x60, [0x00])
        let state = pins.i2cReadNumber(cutebotProAddr, NumberFormat.UInt8LE, true)
        // From left to right the track sensors represent a bit in 'state'.
        // Since in enum 'Track' the values 1-2-4-8-16 agree with FL-L-M-R-FR,
        // on the current 4-line track sensor:
        // - track values 1 (FL) and 2 (L) stay the same
        // - track value 4 is not used
        // - track values 8 and 16 come from the shifted bit values 4 (R) and 8 (FR)
        let track = (state & 3) + ((state & 12) << 1)
        track = trackPosition(track, TrackMask.Track4, trackType)
        return track
    }

    export function isTrackFarLeft(): boolean {
        let track = readTrack()
        return (track == Track.FarLeft)
    }

    export function isTrackAtLeft(): boolean {
        let track = readTrack()
        return (track == Track.Left || track == Track.FarLeft)
    }

    export function isTrackFarRight(): boolean {
        let track = readTrack()
        return (track == Track.FarRight)
    }

    export function isTrackAtRight(): boolean {
        let track = readTrack()
        return (track == Track.Right || track == Track.FarRight)
    }

    export function isOnTrack(): boolean {
        let track = readTrack()
        return (track == Track.Mid)
    }

    export function isOffTrack(): boolean {
        let track = readTrack()
        return (track == Track.OffTrack)
    }

    // DISTANCE MODULE

    export function readDistance(): number {
        // send pulse

        pins.setPull(DigitalPin.P8, PinPullMode.PullNone);
        pins.digitalWritePin(DigitalPin.P8, 0);
        control.waitMicros(2);
        pins.digitalWritePin(DigitalPin.P8, 1);
        control.waitMicros(10);
        pins.digitalWritePin(DigitalPin.P8, 0);

        // read pulse

        // the next code is replacing the original since
        // driving the motors causes interference with pulseIn

        while (!pins.digitalReadPin(DigitalPin.P12)) { }
        let tm1 = input.runningTimeMicros()
        while (pins.digitalReadPin(DigitalPin.P12)) {
            if (input.runningTimeMicros() - tm1 > 7288)
                return 999 // timeout at further than 250 cm
        }
        let tm2 = input.runningTimeMicros()
        let dist = (tm2 - tm1) * 343 / 20000
        return Math.floor(dist)
    }

    // GPIO MODULE

    export function analogPin(port: GpioPort): AnalogPin {
        return AnalogGP[port]
    }

    export function digitalPin(port: GpioPort): DigitalPin {
        return DigitalGP[port]
    }
}

///////////////////
//  END INCLUDE  //
///////////////////

enum Steer {
    //% block="sharp to the left"
    //% block.loc.nl="scherp naar links"
    SharpLeft,
    //% block="to the left"
    //% block.loc.nl="naar links"
    Left,
    //% block="slight to the left"
    //% block.loc.nl="flauw naar links"
    SlightLeft,
    //% block="straight forward"
    //% block.loc.nl="recht vooruit"
    Straight,
    //% block="slight to the right"
    //% block.loc.nl="flauw naar rechts"
    SlightRight,
    //% block="to the right"
    //% block.loc.nl="naar rechts"
    Right,
    //% block="sharp to the right"
    //% block.loc.nl="scherp naar rechts"
    SharpRight
}

CutebotPro.setTrackType(TrackType.LightOnDark)

let onOffTrack: handler
let onOnTrack: handler
let onFarLeft: handler
let onLeft: handler
let onRight: handler
let onFarRight: handler

//% color="#00CC00" icon="\uf1b9"
//% block="LineFollower"
//% block.loc.nl="LijnVolger"
namespace LineFollower {

    let speed = 20

    //% block="steer %dir"
    //% block.loc.nl="stuur %dir"
    export function steer(dir: Steer) {
        switch (dir) {
            case Steer.SharpRight: CutebotPro.twoWheelSpeed(speed, 0); break
            case Steer.Right: CutebotPro.twoWheelSpeed(speed, speed/4); break
            case Steer.SlightRight: CutebotPro.twoWheelSpeed(speed, speed/2); break
            case Steer.Straight: CutebotPro.twoWheelSpeed(speed, speed); break
            case Steer.SlightLeft: CutebotPro.twoWheelSpeed(speed / 2, speed); break
            case Steer.Left: CutebotPro.twoWheelSpeed(speed / 4, speed); break
            case Steer.SharpLeft: CutebotPro.twoWheelSpeed(0, speed); break
        }
    }

    //% block="set speed to %newspeed"
    //% block.loc.nl="stel de snelheid in op %newspeed"
    //% newspeed.min=0 newspeed.max=100 newspeed.defl=20
    export function setSpeed(newspeed: number) {
        speed = newspeed
    }

    //% block="the buggy is %track"
    //% block.loc.nl="de buggy is %track"
    export function isTrackPosition(track: Track) : boolean {
        switch (track) {
            case Track.OffTrack: return CutebotPro.isOffTrack()
            case Track.FarLeft: return CutebotPro.isTrackFarLeft()
            case Track.Left: return CutebotPro.isTrackAtLeft()
            case Track.Mid: return CutebotPro.isOnTrack()
            case Track.Right: return CutebotPro.isTrackAtRight()
            case Track.FarRight: return CutebotPro.isTrackFarRight()
        }
        return false
    }

    //% block="set track to %tracktype"
    //% block.loc.nl="de lijn is %tracktype"
    export function trackType(tracktype: TrackType) {
        CutebotPro.setTrackType(TrackType.LightOnDark)
    }

    //% color="#802080"
    //% block="when the buggy is %track"
    //% block.loc.nl="wanneer the buggy %track is"
    export function onTrackPosition(track: Track, code: () => void) {
        switch (track) {
            case Track.OffTrack: onOffTrack = code; break
            case Track.FarLeft: onFarLeft = code; break
            case Track.Left: onLeft = code; break
            case Track.Mid: onOnTrack = code; break
            case Track.Right: onRight = code; break
            case Track.FarRight: onFarLeft = code; break
        }
    }
}
