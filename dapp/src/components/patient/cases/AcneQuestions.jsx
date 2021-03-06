import React, { Component } from 'react'
import { HippoToggleButtonGroup } from '~/components/forms/HippoToggleButtonGroup'
import { HippoTextInput } from '~/components/forms/HippoTextInput'
import { HippoCheckboxGroup } from '~/components/forms/HippoCheckboxGroup'

export const AcneQuestions = class _AcneQuestions extends Component {

  render() {
    const {
      errors,
      textInputOnBlur,
      textInputOnChange,
      buttonGroupOnChange,
      checkboxGroupOnChange,
      gender
    } = this.props

    return (
      <span>
        <HippoToggleButtonGroup
          id='howLong'
          name="howLong"
          colClasses='col-xs-12 col-md-12'
          label='How long has it been there?'
          error={errors['howLong']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Days', 'Weeks', 'Months', 'Years']}
        />

        <HippoCheckboxGroup
          id='acneDoesItInclude'
          name="acneDoesItInclude"
          colClasses='col-xs-8 col-md-8'
          label='Does it include: (check all that apply)'
          error={errors['acneDoesItInclude']}
          checkboxGroupOnChange={checkboxGroupOnChange}
          values={['Whiteheads/Blackheads', 'Large bumps/nodules', 'Cysts']}
        />


        <HippoToggleButtonGroup
          id='worseWithPeriod'
          name="worseWithPeriod"
          colClasses='col-xs-12 col-md-12'
          label='Worse with period?'
          error={errors['worseWithPeriod']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Yes', 'No']}
          visible={gender === 'Female' ? true : false}
        />

        <HippoToggleButtonGroup
          id='onBirthControl'
          name="onBirthControl"
          colClasses='col-xs-12 col-md-12'
          label='Taking birth control?'
          error={errors['onBirthControl']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Yes', 'No']}
          visible={gender === 'Female' ? true : false}
        />

        <HippoToggleButtonGroup
          id='sexuallyActive'
          name="sexuallyActive"
          colClasses='col-xs-12 col-md-12'
          label='Sexually active?'
          error={errors['sexuallyActive']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Yes', 'No']}
        />

        <HippoTextInput
          id='prevTreatment'
          name="prevTreatment"
          colClasses='col-xs-12 col-sm-12 col-md-12'
          label='Tried any treatments?'
          error={errors['prevTreatment']}
          textInputOnBlur={textInputOnBlur}
          textInputOnChange={textInputOnChange}
        />
      </span>
    )
  }

}
