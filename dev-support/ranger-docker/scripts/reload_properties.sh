#!/bin/bash
function getInstallProperty() {
	local propertyName=$1
	local propertyValue=""

	for file in "${COMPONENT_INSTALL_ARGS}" "${INSTALL_ARGS}"
	do
		if [ -f "${file}" ]
		then
			propertyValue=`grep "^${propertyName}[ \t]*=" ${file} | awk -F= '{  sub("^[ \t]*", "", $2); sub("[ \t]*$", "", $2); print $2 }'`
			if [ "${propertyValue}" != "" ]
			then
				break
			fi
		fi
	done

	if [[ $propertyValue == \$* ]] && [[ $propertyValue != \$PWD* ]]
	then
	propertyValue=${propertyValue:1}
	propertyValue=${!propertyValue}
	fi

	echo ${propertyValue}
}

#Check Properties whether in File, return code 1 if not exist
#$1 -> propertyName; $2 -> fileName
checkPropertyInFile(){
	validate=$(sed '/^\#/d' $2 | grep "^$1"  | tail -n 1 | cut -d "=" -f1-) # for validation
	if test -z "$validate" ; then return 1; fi
}

#Add Properties to File
#$1 -> propertyName; $2 -> newPropertyValue; $3 -> fileName
addPropertyToFile(){
	echo "$1=$2">>$3
	validate=$(sed '/^\#/d' $3 | grep "^$1"  | tail -n 1 | cut -d "=" -f2-) # for validation
	if test -z "$validate" ; then log "[E] Failed to add properties '$1' to $3 file!"; exit 1; fi
	echo "Property $1 added successfully."
}

#Update Properties to File
#$1 -> propertyName; $2 -> newPropertyValue; $3 -> fileName
updatePropertyToFile(){
	sed -i 's@^'$1'=[^ ]*$@'$1'='$2'@g' $3
	validate=$(sed '/^\#/d' $3 | grep "^$1"  | tail -n 1 | cut -d "=" -f2-) # for validation
	if test -z "$validate" ; then log "[E] '$1' not found in $3 file while Updating....!!"; exit 1; fi
	echo "Property $1 updated successfully."
}

#Add or Update Properties to File
#$1 -> propertyName; $2 -> newPropertyValue; $3 -> fileName
addOrUpdatePropertyToFile(){
	checkPropertyInFile $1 $3
	if [ $? -eq 1 ]
	then
	addPropertyToFile $1 $2 $3
	else
	updatePropertyToFile $1 $2 $3
	fi
}

# INSTALL_ARGS="${PROJ_INSTALL_DIR}/install.properties"
INSTALL_ARGS=$1

for propertyName in $(sed '/^\#/d' $INSTALL_ARGS | grep "\$." | cut -d "=" -f1)
do
	echo "found propertyName containing environment variable: $propertyName"
	newPropertyValue=$(getInstallProperty ${propertyName})

	if [ newPropertyValue = "null" ] || [ -z "${newPropertyValue}" ]
	then
	continue
	fi

	addOrUpdatePropertyToFile ${propertyName} ${newPropertyValue} $INSTALL_ARGS
done