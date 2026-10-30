"use client";

import { Briefcase01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";

export function ProfileWidget() {
  return (
    <aside
      className="profile-widget"
      aria-label="Prasad Madhuranga profile"
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <Card className="profile-card">
        <CardHeader className="profile-card-header">
          {/* Replace this shared placeholder file when the final portrait is ready. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="profile-card-photo"
            src="/images/profile-placeholder.jpg"
            alt="Prasad Madhuranga"
          />
          <div className="profile-card-identity">
            <CardTitle>Prasad Madhuranga</CardTitle>
            <CardDescription>Mechanical + Mechatronics Engineer</CardDescription>
          </div>
        </CardHeader>

        <CardPanel className="profile-card-panel">
          <dl className="profile-card-details">
            <div>
              <dt>
                <HugeiconsIcon icon={Location01Icon} strokeWidth={2} aria-hidden="true" />
                Location
              </dt>
              <dd>Sri Lanka</dd>
            </div>
            <div>
              <dt>
                <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} aria-hidden="true" />
                Focus
              </dt>
              <dd>Robotics · automation · machine vision</dd>
            </div>
          </dl>
        </CardPanel>

        <CardFooter className="profile-card-footer">
          <span className="profile-card-availability">
            <span aria-hidden="true" />
            Open to collaboration
          </span>
        </CardFooter>
      </Card>
    </aside>
  );
}
