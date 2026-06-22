import { GlobalHeader } from "@/components/global-header"
import { SidebarLayout } from "@/components/sidebar-layout"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { SwipeNavigator } from "@/components/swipe-navigator"
import { ReConsentModal } from "@/components/legal/ReConsentModal"

export function AppChrome({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SidebarLayout>
        <GlobalHeader />
        <SwipeNavigator>{children}</SwipeNavigator>
      </SidebarLayout>
      <BottomTabBar />
      <ReConsentModal />
    </>
  )
}
