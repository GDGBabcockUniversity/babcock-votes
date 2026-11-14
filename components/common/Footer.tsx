"use client";
import React from "react";
import Image from "next/image";
import clsx from "clsx";
import TwitterIcon from "@icons/common/twitter.svg";
import TiktokIcon from "@icons/common/tiktok.svg";
import InstagramIcon from "@icons/common/instagram.svg";
import "@/styles/common/Footer.css";

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={clsx("footer flex items-center justify-between w-full mt-auto", className)}>
      <Image src="/images/common/gdg-logo.png" alt="Google Developer Group Babcock University" width={246} height={50} className="footer-logo w-auto object-contain" priority={false} />
      <div className="footer-socials flex items-center gap-3">
        <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X / Twitter" className="footer-social-link flex items-center justify-center">
          <TwitterIcon aria-hidden="true" className="w-full h-full" />
        </a>
        <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok" className="footer-social-link flex items-center justify-center">
          <TiktokIcon aria-hidden="true" className="w-full h-full" />
        </a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="footer-social-link flex items-center justify-center">
          <InstagramIcon aria-hidden="true" className="w-full h-full" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
