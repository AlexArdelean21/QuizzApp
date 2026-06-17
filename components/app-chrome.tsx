import { GlobalHeader } from "@/components/global-header"
import { SidebarLayout } from "@/components/sidebar-layout"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { SwipeNavigator } from "@/components/swipe-navigator"

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
    </>
  )
}
