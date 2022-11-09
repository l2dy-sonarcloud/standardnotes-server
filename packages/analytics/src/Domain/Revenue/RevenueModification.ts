import { Aggregate } from '../Core/Aggregate'
import { UniqueEntityId } from '../Core/UniqueEntityId'
import { MonthlyRevenue } from './MonthlyRevenue'
import { RevenueModificationProps } from './RevenueModificationProps'

export class RevenueModification extends Aggregate<RevenueModificationProps> {
  private constructor(props: RevenueModificationProps, id?: UniqueEntityId) {
    super(props, id)
  }

  static create(props: RevenueModificationProps, id?: UniqueEntityId): RevenueModification {
    const revenueModification = new RevenueModification(
      {
        ...props,
        createdAt: props.createdAt ? props.createdAt : new Date(),
      },
      id,
    )

    return revenueModification
  }

  get newMonthlyRevenue(): MonthlyRevenue {
    const { subscription } = this.props

    let revenue = 0
    switch (this.props.eventType.value) {
      case 'SUBSCRIPTION_PURCHASED':
      case 'SUBSCRIPTION_RENEWED':
        revenue = subscription.props.payedAmount / subscription.props.billingFrequency
        break
      case 'SUBSCRIPTION_EXPIRED':
      case 'SUBSCRIPTION_REFUNDED':
        revenue = 0
        break
      case 'SUBSCRIPTION_CANCELLED':
        revenue = this.props.previousMonthlyRevenue.value
        break
    }

    const monthlyRevenueOrError = MonthlyRevenue.create(revenue)

    return monthlyRevenueOrError.getValue()
  }
}