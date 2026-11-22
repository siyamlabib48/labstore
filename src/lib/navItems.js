import { LayoutDashboard, LayoutGrid, MessagesSquare, MessageCircle, Megaphone, Upload, FolderOpen, Trophy, Target, Users, ShieldCheck } from 'lucide-react';

export function navItems({ canManage, pending = 0 }) {
  const items = [
    { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/gallery', label: 'Gallery', icon: LayoutGrid },
    { to: '/golpo-gujob', label: 'Golpo', icon: MessagesSquare },
    { to: '/announcements', label: 'Notices', icon: Megaphone },
    { to: '/chats', label: 'Chats', icon: MessageCircle },
    { to: '/upload', label: 'Upload', icon: Upload },
    { to: '/gallery?view=mine', label: 'My works', icon: FolderOpen },
    { to: '/progress', label: 'Progress', icon: Target },
    { to: '/leaderboard', label: 'Ranks', icon: Trophy },
    { to: '/friends', label: 'Friends', icon: Users, badge: pending },
  ];
  if (canManage) items.push({ to: '/admin', label: 'Manage', icon: ShieldCheck });
  return items;
}